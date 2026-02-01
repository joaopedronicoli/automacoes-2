import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AutomationsService } from '../../automations/automations.service';
import { PostsService } from '../../posts/posts.service';
import { TriggerService } from '../../automations/trigger.service';
import { ActionExecutorService } from '../../automations/action-executor.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';

@Processor('automations')
export class AutomationProcessor {
    private readonly logger = new Logger(AutomationProcessor.name);

    constructor(
        private automationsService: AutomationsService,
        private postsService: PostsService,
        private triggerService: TriggerService,
        private actionExecutorService: ActionExecutorService,
        private socialAccountsService: SocialAccountsService,
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

    @Process('sync-post')
    async handleSyncPost(job: Job) {
        const { platform, pageId, postId } = job.data;
        this.logger.log(`Syncing single post ${postId} for page ${pageId}`);
        // Ideally call PostsSyncService.syncPost(platform, pageId, postId)
        // For now logging it.
    }
}
