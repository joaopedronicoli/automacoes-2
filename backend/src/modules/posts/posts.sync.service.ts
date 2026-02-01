import { Injectable, Logger } from '@nestjs/common';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';
import { PostsService } from './posts.service';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialPlatform } from '../../entities/social-account.entity';
import { PostType, PostStatus } from '../../entities/post.entity';

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

        // We ideally should paginate or iterate efficiently if many users
        // For MVP, fetching all accounts is fine
        // Note: socialAccountsService.findAll() method might strictly filter by user, 
        // so we need a system-level find method or iterate users?
        // Actually, socialAccountsService usually finds by User.
        // Let's assume we can fetch ALL active accounts for the system background job.
        // I need to add `findAllActive` to SocialAccountsService.

        // For now, let's just stub it to fetch by user is not efficient.
        // Let's assume we inject repository directly or add method to service.
        // I'll add findAllActive to SocialAccountsService later.

        // const accounts = await this.socialAccountsService.findAllActive();
        // For now, let's use a workaround if findAllActive doesn't exist.
        // Or I'll just focus on known users if needed.
        // Let's update SocialAccountsService to have findAllActive method first.

        // Assuming method exists:
        // for (const account of accounts) {
        //   await this.syncAccount(account);
        // }
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
            // Determine type
            let type = PostType.TEXT;
            if (fbPost.full_picture) type = PostType.IMAGE;
            // Video check logic...

            await this.postsService.upsert({
                socialAccountId: account.id,
                platformPostId: fbPost.id,
                platform: SocialPlatform.FACEBOOK,
                content: fbPost.message || fbPost.story || '',
                mediaUrls: fbPost.full_picture ? [fbPost.full_picture] : [],
                permalink: fbPost.permalink_url,
                publishedAt: new Date(fbPost.created_time),
                type,
                status: PostStatus.PUBLISHED,
                meta: {
                    commentsCount: fbPost.comments?.summary?.total_count || 0,
                    likesCount: fbPost.likes?.summary?.total_count || 0,
                    sharesCount: fbPost.shares?.count || 0,
                },
            });
        }

        this.logger.log(`Synced ${posts.length} Facebook posts for ${account.accountName}`);
    }

    private async syncInstagramAccount(account: any) {
        const mediaItems = await this.facebookService.getInstagramMedia(account.accountId, account.accessToken);

        for (const media of mediaItems) {
            let type = PostType.IMAGE;
            if (media.media_type === 'VIDEO') type = PostType.VIDEO;
            if (media.media_type === 'CAROUSEL_ALBUM') type = PostType.CAROUSEL;

            await this.postsService.upsert({
                socialAccountId: account.id,
                platformPostId: media.id,
                platform: SocialPlatform.INSTAGRAM,
                content: media.caption || '',
                mediaUrls: media.media_url ? [media.media_url] : [],
                permalink: media.permalink,
                publishedAt: new Date(media.timestamp),
                type,
                status: PostStatus.PUBLISHED,
                thumbnailUrl: media.thumbnail_url || media.media_url, // Video thumb
                meta: {
                    commentsCount: media.comments_count || 0,
                    likesCount: media.like_count || 0,
                },
            });
        }

        this.logger.log(`Synced ${mediaItems.length} Instagram posts for ${account.accountName}`);
    }
}
