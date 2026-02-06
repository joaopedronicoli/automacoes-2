import { Injectable, Logger } from '@nestjs/common';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { IntegrationsService } from '../integrations/integrations.service';
import { LogsService } from '../logs/logs.service';
import { SocialPlatform } from '../../entities/social-account.entity';
import { LogActionType, LogStatus } from '../../entities/automation-log.entity';

@Injectable()
export class InstagramChatwootService {
    private readonly logger = new Logger(InstagramChatwootService.name);

    constructor(
        private chatwootService: ChatwootService,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
        private integrationsService: IntegrationsService,
        private logsService: LogsService,
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

        // 2. Find the Chatwoot integration by instagramAccountId first, then fallback to userId
        let integration = await this.integrationsService.findChatwootByInstagramAccountId(instagramAccountId);

        if (!integration) {
            integration = await this.integrationsService.findActiveChatwoot(socialAccount.userId);
        }

        if (!integration) {
            this.logger.warn(`No active Chatwoot integration for Instagram account ${instagramAccountId} or user ${socialAccount.userId}`);
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
        let senderUsername: string | undefined;
        let customAttributes: Record<string, any> = {};

        try {
            const profile = await this.facebookService.getUserInfo(senderId, socialAccount.accessToken);
            if (profile) {
                senderName = profile.name || profile.username || senderName;
                senderAvatar = profile.profile_pic;
                senderUsername = profile.username;

                // Build custom attributes with available Instagram data
                if (profile.username) {
                    customAttributes.instagram_username = profile.username;
                    customAttributes.instagram_url = `https://instagram.com/${profile.username}`;
                }
                if (profile.follower_count !== undefined) {
                    customAttributes.instagram_followers = profile.follower_count;
                }
                if (profile.is_verified_user !== undefined) {
                    customAttributes.instagram_verified = profile.is_verified_user;
                }
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

        // 5. Update contact with additional Instagram data if available
        if (Object.keys(customAttributes).length > 0 || senderAvatar) {
            try {
                await this.chatwootService.updateContact(
                    chatwootUrl,
                    chatwootToken,
                    chatwootAccountId,
                    contact.id,
                    {
                        name: senderName,
                        avatar_url: senderAvatar,
                        custom_attributes: customAttributes,
                    },
                );
            } catch {
                this.logger.warn(`Could not update Chatwoot contact ${contact.id} with Instagram data`);
            }
        }

        // 6. Find or create conversation
        const conversation = await this.chatwootService.findOrCreateInstagramConversation(
            chatwootUrl,
            chatwootToken,
            chatwootAccountId,
            contact.id,
            chatwootInboxId,
            instagramAccountId,
        );

        // 7. Create incoming message
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

        // 8. Save log
        await this.logsService.create({
            userId: socialAccount.userId,
            actionType: LogActionType.INSTAGRAM_DM_FORWARDED,
            status: LogStatus.SUCCESS,
            userPlatformId: senderId,
            userName: senderName,
            userUsername: senderUsername,
            content: message ? (message.length > 100 ? message.substring(0, 100) + '...' : message) : 'Mensagem recebida',
            metadata: {
                instagramAccountId,
                chatwootConversationId: conversation.id,
                chatwootContactId: contact.id,
            },
        });
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
            this.logger.log(`No Instagram integration found for inbox ${inboxId}, skipping`);
            return;
        }

        const chatwootUrl = integration.storeUrl;
        const chatwootToken = integration.consumerKey;
        const chatwootAccountId = integration.metadata?.accountId;

        // 2. Get the recipient's IGSID from the Chatwoot contact identifier
        let recipientId: string | null = null;

        // Extract identifier directly from meta.sender in webhook payload (this is the IGSID)
        const senderIdentifier = conversationData?.meta?.sender?.identifier;
        this.logger.log(`Outgoing message - meta.sender.identifier: ${senderIdentifier}, meta.sender.name: ${conversationData?.meta?.sender?.name}`);

        if (senderIdentifier) {
            // Skip if this is a WhatsApp identifier (contains @s.whatsapp.net or starts with +)
            if (senderIdentifier.includes('@') || senderIdentifier.startsWith('+')) {
                this.logger.log(`Skipping non-Instagram identifier: ${senderIdentifier}`);
                return;
            }
            recipientId = senderIdentifier;
            this.logger.log(`Got recipient from meta.sender.identifier: ${recipientId}`);
        }

        // Fallback: look up contact via API
        if (!recipientId) {
            const contactId = conversationData?.meta?.sender?.id
                || conversationData?.contact_id;

            this.logger.log(`Trying API lookup with contactId: ${contactId}`);

            if (contactId && chatwootAccountId) {
                const contact = await this.chatwootService.getContactById(
                    chatwootUrl,
                    chatwootToken,
                    chatwootAccountId,
                    contactId,
                );
                this.logger.log(`Contact API response for ${contactId}: ${JSON.stringify(contact ? { id: contact.id, identifier: contact.identifier, name: contact.name } : null)}`);
                recipientId = contact?.identifier || null;
            }
        }

        // Fallback: get full conversation from API and look up contact
        if (!recipientId) {
            const conversationId = conversationData?.id || conversationData?.display_id;
            this.logger.log(`Fallback: fetching full conversation ${conversationId} from Chatwoot API`);

            if (conversationId && chatwootAccountId) {
                const fullConversation = await this.chatwootService.getConversationById(
                    chatwootUrl,
                    chatwootToken,
                    chatwootAccountId,
                    conversationId,
                );

                // Try source_id from full conversation
                const fullSourceId = fullConversation?.contact_inbox?.source_id;
                if (fullSourceId) {
                    recipientId = fullSourceId;
                    this.logger.log(`Got recipient from full conversation contact_inbox.source_id: ${recipientId}`);
                }

                // Try contact lookup from full conversation
                if (!recipientId) {
                    const fullContactId = fullConversation?.meta?.sender?.id || fullConversation?.contact_id;
                    if (fullContactId) {
                        const contactFromConv = await this.chatwootService.getContactById(
                            chatwootUrl,
                            chatwootToken,
                            chatwootAccountId,
                            fullContactId,
                        );
                        recipientId = contactFromConv?.identifier || null;
                    }
                }
            }
        }

        if (!recipientId) {
            this.logger.error(`Could not determine Instagram recipient ID from Chatwoot conversation`);
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

        // Fallback: use instagramAccountId from integration metadata
        if (!socialAccount && integration.metadata?.instagramAccountId) {
            socialAccount = await this.socialAccountsService.findByPlatformAndId(
                SocialPlatform.INSTAGRAM,
                integration.metadata.instagramAccountId,
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
        const tokenPreview = socialAccount.accessToken ? `${socialAccount.accessToken.substring(0, 20)}...` : 'NO_TOKEN';
        const linkedPageId = socialAccount.metadata?.linked_page_id;
        this.logger.log(`Sending Instagram DM: from=${socialAccount.accountId} (${socialAccount.accountName}), to=${recipientId}, token=${tokenPreview}, pageId=${linkedPageId}`);

        await this.facebookService.sendInstagramMessage(
            socialAccount.accountId,
            recipientId,
            content,
            socialAccount.accessToken,
            linkedPageId,
        );

        this.logger.log(`Chatwoot message sent to Instagram user ${recipientId}`);
    }
}
