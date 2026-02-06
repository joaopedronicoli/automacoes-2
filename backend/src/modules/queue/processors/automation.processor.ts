import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AutomationsService } from '../../automations/automations.service';
import { PostsService } from '../../posts/posts.service';
import { TriggerService } from '../../automations/trigger.service';
import { ActionExecutorService } from '../../automations/action-executor.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { InstagramChatwootService } from '../../instagram-chatwoot/instagram-chatwoot.service';
import { InboxService } from '../../inbox/inbox.service';

@Processor('automations')
export class AutomationProcessor {
    private readonly logger = new Logger(AutomationProcessor.name);

    constructor(
        private automationsService: AutomationsService,
        private postsService: PostsService,
        private triggerService: TriggerService,
        private actionExecutorService: ActionExecutorService,
        private socialAccountsService: SocialAccountsService,
        private instagramChatwootService: InstagramChatwootService,
        private inboxService: InboxService,
    ) { }

    @Process('process-comment')
    async handleComment(job: Job) {
        const { platform, pageId, instagramAccountId, postId, commentId, userId, userName, message, createdTime } = job.data;

        this.logger.log(`Processing comment ${commentId} on post ${postId} from user ${userId}`);

        try {
            const platformUserId = platform === 'facebook' ? pageId : instagramAccountId;

            const post = await this.postsService.findByPlatformId(platformUserId, postId);

            let automations = [];
            if (post) {
                automations = await this.automationsService.findByPostId(post.id);
            }

            if (!automations || automations.length === 0) {
                // Fallback: check global account automations? (future)
                this.logger.debug(`No active automations found for post ${postId}`);
                return;
            }

            // Fetch account token once
            const account = await this.socialAccountsService.findByPlatformAndId(platform, platformUserId);
            if (!account) {
                this.logger.error(`Account not found for ${platform}:${platformUserId}`);
                return; // Can't reply
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
        const { platform, instagramAccountId, senderId, message, timestamp, messageId } = job.data;

        this.logger.log(`Processing ${platform} message from ${senderId}`);

        try {
            if (platform === 'instagram') {
                // 1. Save to Inbox (internal database)
                try {
                    await this.inboxService.handleIncomingMessage({
                        instagramAccountId,
                        senderId,
                        message,
                        messageId,
                        timestamp,
                    });
                    this.logger.log(`Message saved to inbox from ${senderId}`);
                } catch (inboxError) {
                    this.logger.error(`Failed to save message to inbox: ${inboxError.message}`);
                    // Continue to Chatwoot even if inbox fails
                }

                // 2. Forward Instagram DM to Chatwoot (if integration exists)
                try {
                    await this.instagramChatwootService.handleIncomingInstagramMessage({
                        instagramAccountId,
                        senderId,
                        message,
                        timestamp,
                    });
                } catch (chatwootError) {
                    this.logger.warn(`Failed to forward to Chatwoot: ${chatwootError.message}`);
                    // Don't throw - inbox already has the message
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
