import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Job } from 'bull';
import { AutomationsService } from '../../automations/automations.service';
import { PostsService } from '../../posts/posts.service';
import { TriggerService } from '../../automations/trigger.service';
import { ActionExecutorService } from '../../automations/action-executor.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { FacebookService } from '../../platforms/facebook/facebook.service';
import { InstagramChatwootService } from '../../instagram-chatwoot/instagram-chatwoot.service';
import { InboxService } from '../../inbox/inbox.service';
import { ContactsService } from '../../contacts/contacts.service';
import { InteractionType } from '../../../entities/contact-interaction.entity';

@Processor('automations')
export class AutomationProcessor {
    private readonly logger = new Logger(AutomationProcessor.name);

    constructor(
        private automationsService: AutomationsService,
        private postsService: PostsService,
        private triggerService: TriggerService,
        private actionExecutorService: ActionExecutorService,
        private socialAccountsService: SocialAccountsService,
        @Inject(forwardRef(() => FacebookService))
        private facebookService: FacebookService,
        private instagramChatwootService: InstagramChatwootService,
        private inboxService: InboxService,
        private contactsService: ContactsService,
    ) { }

    @Process('process-comment')
    async handleComment(job: Job) {
        const { platform, pageId, instagramAccountId, postId, mediaId, commentId, userId, userName, message, createdTime } = job.data;

        this.logger.log(`Processing comment ${commentId} on post ${postId || mediaId} from user ${userId}`);

        try {
            const platformUserId = platform === 'facebook' ? pageId : instagramAccountId;
            const postPlatformId = postId || mediaId;

            // Fetch account first to get user info
            const account = await this.socialAccountsService.findByPlatformAndId(platform, platformUserId);
            if (!account) {
                this.logger.error(`Account not found for ${platform}:${platformUserId}`);
                return;
            }

            // Fetch user profile for avatar and extra info
            let profileName = userName;
            let profileUsername = userName;
            let profileAvatar: string | undefined;
            let profileFollowers: number | undefined;
            let profileVerified = false;

            try {
                const profile = await this.facebookService.getUserInfo(userId, account.accessToken);
                if (profile) {
                    profileName = profile.name || profile.username || userName;
                    profileUsername = profile.username || userName;
                    profileAvatar = profile.profile_pic;
                    profileFollowers = profile.follower_count;
                    profileVerified = profile.is_verified_user || false;
                }
            } catch (profileError) {
                this.logger.warn(`Could not fetch profile for ${userId}: ${profileError.message}`);
            }

            // Create/update contact and record interaction
            try {
                const contact = await this.contactsService.findOrCreateContact({
                    userId: account.userId,
                    socialAccountId: account.id,
                    platform,
                    platformUserId: userId,
                    username: profileUsername,
                    name: profileName,
                    avatar: profileAvatar,
                    followerCount: profileFollowers,
                    isVerified: profileVerified,
                });

                await this.contactsService.recordInteraction({
                    contactId: contact.id,
                    type: InteractionType.COMMENT,
                    content: message,
                    postId: postPlatformId,
                    externalId: commentId,
                    metadata: { createdTime },
                });

                this.logger.log(`Contact ${contact.id} updated with comment interaction`);
            } catch (contactError) {
                this.logger.warn(`Failed to record contact interaction: ${contactError.message}`);
            }

            const post = await this.postsService.findByPlatformId(platformUserId, postPlatformId);

            let automations = [];
            if (post) {
                automations = await this.automationsService.findByPostId(post.id);
            }

            if (!automations || automations.length === 0) {
                this.logger.debug(`No active automations found for post ${postPlatformId}`);
                return;
            }

            for (const automation of automations) {
                if (automation.status !== 'active') continue;

                // Check Triggers using dedicated service
                const isMatch = this.triggerService.evaluate(automation.triggers, message, {
                    userId,
                    userName
                });

                if (!isMatch) continue;

                this.logger.log(`Trigger matched for automation ${automation.id}. Executing actions...`);

                // Execute Actions using dedicated service
                await this.actionExecutorService.execute(
                    automation.id,
                    automation.responseConfig,
                    {
                        platform,
                        platformUserId,
                        targetUserId: userId,
                        targetUserName: userName,
                        itemId: commentId,
                        accessToken: account.accessToken
                    },
                    message
                );
            }

        } catch (error) {
            this.logger.error(`Failed to process comment ${commentId}`, error);
            throw error;
        }
    }

    @Process('process-message')
    async handleMessage(job: Job) {
        const { platform, instagramAccountId, pageId, senderId, message, timestamp, messageId } = job.data;

        this.logger.log(`Processing ${platform} message from ${senderId}`);

        try {
            const platformUserId = platform === 'facebook' ? pageId : instagramAccountId;

            // Get account info for contact creation
            const account = await this.socialAccountsService.findByPlatformAndId(platform, platformUserId);

            if (platform === 'instagram') {
                // 1. Save to Inbox (internal database)
                let conversationData;
                try {
                    conversationData = await this.inboxService.handleIncomingMessage({
                        instagramAccountId,
                        senderId,
                        message,
                        messageId,
                        timestamp,
                    });
                    this.logger.log(`Message saved to inbox from ${senderId}`);
                } catch (inboxError) {
                    this.logger.error(`Failed to save message to inbox: ${inboxError.message}`);
                }

                // 2. Create/update contact and record interaction
                if (account) {
                    try {
                        const senderName = conversationData?.conversation?.participantName;
                        const senderUsername = conversationData?.conversation?.participantUsername;
                        const senderAvatar = conversationData?.conversation?.participantAvatar;
                        const followerCount = conversationData?.conversation?.participantFollowers;
                        const isVerified = conversationData?.conversation?.participantVerified;

                        const contact = await this.contactsService.findOrCreateContact({
                            userId: account.userId,
                            socialAccountId: account.id,
                            platform,
                            platformUserId: senderId,
                            username: senderUsername,
                            name: senderName,
                            avatar: senderAvatar,
                            followerCount,
                            isVerified,
                        });

                        await this.contactsService.recordInteraction({
                            contactId: contact.id,
                            type: InteractionType.DM_RECEIVED,
                            content: message,
                            conversationId: conversationData?.conversation?.id,
                            externalId: messageId,
                            metadata: { timestamp },
                        });

                        this.logger.log(`Contact ${contact.id} updated with DM interaction`);
                    } catch (contactError) {
                        this.logger.warn(`Failed to record contact interaction: ${contactError.message}`);
                    }
                }

                // 3. Forward Instagram DM to Chatwoot (if integration exists)
                try {
                    await this.instagramChatwootService.handleIncomingInstagramMessage({
                        instagramAccountId,
                        senderId,
                        message,
                        timestamp,
                    });
                } catch (chatwootError) {
                    this.logger.warn(`Failed to forward to Chatwoot: ${chatwootError.message}`);
                }
            }
            // Facebook Messenger messages could be handled here too in the future
        } catch (error) {
            this.logger.error(`Failed to process message from ${senderId}`, error);
            throw error;
        }
    }

    @Process('sync-post')
    async handleSyncPost(job: Job) {
        const { platform, pageId, postId } = job.data;
        this.logger.log(`Syncing single post ${postId} for page ${pageId}`);
        // Ideally call PostsSyncService.syncPost(platform, pageId, postId)
        // For now logging it.
    }
}
