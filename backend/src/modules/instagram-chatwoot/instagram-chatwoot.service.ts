import { Injectable, Logger } from '@nestjs/common';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { SocialPlatform } from '../../entities/social-account.entity';

@Injectable()
export class InstagramChatwootService {
    private readonly logger = new Logger(InstagramChatwootService.name);

    constructor(
        private chatwootService: ChatwootService,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
        private integrationsService: IntegrationsService,
    ) {}

    /**
     * Handle incoming Instagram DM and forward to Chatwoot
     * Called by the automation processor when a process-message job arrives
     */
    async handleIncomingInstagramMessage(data: {
        instagramAccountId: string;
        senderId: string;
        message: string;
        timestamp: number;
    }): Promise<void> {
        const { instagramAccountId, senderId, message } = data;

        this.logger.log(`Processing Instagram DM from ${senderId} for account ${instagramAccountId}`);

        // 1. Find the SocialAccount to get the userId and access token
        const socialAccount = await this.socialAccountsService.findByPlatformAndId(
            SocialPlatform.INSTAGRAM,
            instagramAccountId,
        );

        if (!socialAccount) {
            this.logger.warn(`No SocialAccount found for Instagram account ${instagramAccountId}`);
            return;
        }

        // 2. Find the user's Chatwoot integration
        const integration = await this.integrationsService.findActiveChatwoot(socialAccount.userId);

        if (!integration) {
            this.logger.warn(`No active Chatwoot integration for user ${socialAccount.userId}`);
            return;
        }

        const chatwootUrl = integration.storeUrl;
        const chatwootToken = integration.consumerKey;
        const chatwootAccountId = integration.metadata?.accountId;
        const chatwootInboxId = integration.metadata?.instagramInboxId || integration.metadata?.inboxId;

        if (!chatwootAccountId || !chatwootInboxId) {
            this.logger.warn('Chatwoot integration missing accountId or inboxId in metadata');
            return;
        }

        // 3. Get sender profile from Instagram
        let senderName = `Instagram User ${senderId}`;
        let senderAvatar: string | undefined;

        try {
            const profile = await this.facebookService.getUserInfo(senderId, socialAccount.accessToken);
            if (profile) {
                senderName = profile.name || senderName;
                senderAvatar = profile.picture?.data?.url;
            }
        } catch {
            this.logger.warn(`Could not fetch Instagram profile for ${senderId}`);
        }

        // 4. Find or create contact in Chatwoot (using IGSID as identifier)
        const contact = await this.chatwootService.findOrCreateContactByIdentifier(
            chatwootUrl,
            chatwootToken,
            chatwootAccountId,
            {
                name: senderName,
                identifier: senderId,
                avatar_url: senderAvatar,
            },
        );

        // 5. Find or create conversation
        const conversation = await this.chatwootService.findOrCreateInstagramConversation(
            chatwootUrl,
            chatwootToken,
            chatwootAccountId,
            contact.id,
            chatwootInboxId,
            instagramAccountId,
        );

        // 6. Create incoming message
        if (message) {
            await this.chatwootService.createIncomingMessage(
                chatwootUrl,
                chatwootToken,
                chatwootAccountId,
                conversation.id,
                message,
            );
        }

        this.logger.log(
            `Instagram DM from ${senderName} forwarded to Chatwoot conversation ${conversation.id}`,
        );
    }

    /**
     * Handle outgoing message from Chatwoot agent and send to Instagram
     * Called by the Chatwoot webhook controller
     */
    async handleOutgoingChatwootMessage(webhookPayload: any): Promise<void> {
        const event = webhookPayload.event;

        if (event !== 'message_created') {
            return;
        }

        const messageType = webhookPayload.message_type;
        const isPrivate = webhookPayload.private;

        // Only process outgoing, non-private messages
        if (messageType !== 'outgoing' || isPrivate) {
            return;
        }

        const conversationData = webhookPayload.conversation;
        const inboxId = conversationData?.inbox_id;
        const content = webhookPayload.content;

        if (!content) {
            return;
        }

        this.logger.log(`Processing Chatwoot outgoing message for inbox ${inboxId}`);

        // 1. Find the integration that matches this inbox
        const integration = await this.integrationsService.findChatwootByInstagramInboxId(inboxId);

        if (!integration) {
            this.logger.debug(`No Instagram integration found for inbox ${inboxId}, skipping`);
            return;
        }

        const chatwootUrl = integration.storeUrl;
        const chatwootToken = integration.consumerKey;
        const chatwootAccountId = integration.metadata?.accountId;

        // 2. Get the recipient's IGSID from the Chatwoot contact identifier
        let recipientId: string | null = null;

        const contactId = conversationData?.meta?.sender?.id
            || conversationData?.contact_id;

        if (contactId && chatwootAccountId) {
            const contact = await this.chatwootService.getContactById(
                chatwootUrl,
                chatwootToken,
                chatwootAccountId,
                contactId,
            );
            recipientId = contact?.identifier || null;
        }

        // Fallback: get full conversation data from Chatwoot API
        if (!recipientId) {
            const conversationId = conversationData?.id;
            if (conversationId && chatwootAccountId) {
                const fullConversation = await this.chatwootService.getConversationById(
                    chatwootUrl,
                    chatwootToken,
                    chatwootAccountId,
                    conversationId,
                );

                if (fullConversation?.meta?.sender?.id) {
                    const contactFromConv = await this.chatwootService.getContactById(
                        chatwootUrl,
                        chatwootToken,
                        chatwootAccountId,
                        fullConversation.meta.sender.id,
                    );
                    recipientId = contactFromConv?.identifier || null;
                }
            }
        }

        if (!recipientId) {
            this.logger.error('Could not determine Instagram recipient ID from Chatwoot conversation');
            return;
        }

        // 3. Find the Instagram social account to send from
        const instagramAccountId = conversationData?.additional_attributes?.instagram_account_id;

        let socialAccount = null;

        if (instagramAccountId) {
            socialAccount = await this.socialAccountsService.findByPlatformAndId(
                SocialPlatform.INSTAGRAM,
                instagramAccountId,
            );
        }

        // Fallback: find any active Instagram account for this user
        if (!socialAccount) {
            const userAccounts = await this.socialAccountsService.findByUser(integration.userId);
            const instagramAccount = userAccounts.find(a => a.platform === SocialPlatform.INSTAGRAM);
            if (instagramAccount) {
                socialAccount = await this.socialAccountsService.findById(instagramAccount.id);
            }
        }

        if (!socialAccount) {
            this.logger.error('No Instagram social account found to send message');
            return;
        }

        // 4. Send message via Instagram API
        await this.facebookService.sendInstagramMessage(
            socialAccount.accountId,
            recipientId,
            content,
            socialAccount.accessToken,
        );

        this.logger.log(`Chatwoot message sent to Instagram user ${recipientId}`);
    }
}
