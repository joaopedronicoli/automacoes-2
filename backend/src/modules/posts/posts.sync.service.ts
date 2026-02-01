import { Injectable, Logger } from '@nestjs/common';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { PostsService } from './posts.service';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialPlatform } from '../../entities/social-account.entity';

@Injectable()
export class PostsSyncService {
    private readonly logger = new Logger(PostsSyncService.name);

    constructor(
        private socialAccountsService: SocialAccountsService,
        private postsService: PostsService,
        private facebookService: FacebookService,
    ) { }

    /**
     * Sync all connected accounts
     */
    async syncAllAccounts() {
        this.logger.log('Starting full accounts sync...');
        // TODO: Implement findAllActive in SocialAccountsService
    }

    /**
     * Sync a specific account
     */
    async syncAccount(accountId: string) {
        const account = await this.socialAccountsService.findById(accountId);
        if (!account) return;

        this.logger.log(`Syncing posts for account ${account.accountName} (${account.platform})`);

        try {
            if (account.platform === SocialPlatform.FACEBOOK) {
                await this.syncFacebookPage(account);
            } else if (account.platform === SocialPlatform.INSTAGRAM) {
                await this.syncInstagramAccount(account);
            }
        } catch (error) {
            this.logger.error(`Failed to sync account ${account.id}`, error);
        }
    }

    private async syncFacebookPage(account: any) {
        const posts = await this.facebookService.getPagePosts(account.accountId, account.accessToken);

        for (const fbPost of posts) {
            await this.postsService.upsert({
                socialAccountId: account.id,
                platformPostId: fbPost.id,
                content: fbPost.message || fbPost.story || '',
                mediaUrl: fbPost.full_picture || null,
                mediaType: fbPost.full_picture ? 'image' : 'text',
                postUrl: fbPost.permalink_url,
                publishedAt: new Date(fbPost.created_time),
                commentsCount: fbPost.comments?.summary?.total_count || 0,
                likesCount: fbPost.likes?.summary?.total_count || 0,
                sharesCount: fbPost.shares?.count || 0,
            });
        }

        this.logger.log(`Synced ${posts.length} Facebook posts for ${account.accountName}`);
    }

    private async syncInstagramAccount(account: any) {
        const mediaItems = await this.facebookService.getInstagramMedia(account.accountId, account.accessToken);

        for (const media of mediaItems) {
            await this.postsService.upsert({
                socialAccountId: account.id,
                platformPostId: media.id,
                content: media.caption || '',
                mediaUrl: media.media_url || null,
                mediaType: media.media_type?.toLowerCase() || 'image',
                thumbnailUrl: media.thumbnail_url || media.media_url,
                postUrl: media.permalink,
                publishedAt: new Date(media.timestamp),
                commentsCount: media.comments_count || 0,
                likesCount: media.like_count || 0,
            });
        }

        this.logger.log(`Synced ${mediaItems.length} Instagram posts for ${account.accountName}`);
    }
}
