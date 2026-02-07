import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { AutomationLog, LogStatus } from '../../entities/automation-log.entity';
import { SocialAccount } from '../../entities/social-account.entity';

@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(Post)
        private postsRepo: Repository<Post>,
        @InjectRepository(AutomationLog)
        private logsRepo: Repository<AutomationLog>,
        @InjectRepository(SocialAccount)
        private accountsRepo: Repository<SocialAccount>,
    ) { }

    async getDashboardStats(userId: string) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // 1. Total Comments from posts
        const resComments = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .select('SUM(post.commentsCount)', 'totalComments')
            .getRawOne();
        const totalComments = parseInt(resComments?.totalComments) || 0;

        // 2. Total Likes from posts
        const resLikes = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .select('SUM(post.likesCount)', 'totalLikes')
            .getRawOne();
        const totalLikes = parseInt(resLikes?.totalLikes) || 0;

        // 3. Automations Run (Total Logs) - use userId directly
        const automationsRun = await this.logsRepo.count({
            where: { userId },
        });

        // 4. Success Rate
        const successfulRuns = await this.logsRepo.count({
            where: { userId, status: LogStatus.SUCCESS },
        });
        const successRate = automationsRun > 0 ? Math.round((successfulRuns / automationsRun) * 100) : 0;

        // 5. Reach - sum followers_count from social accounts metadata
        const accounts = await this.accountsRepo.find({ where: { userId } });
        const reach = accounts.reduce((sum, acc) => {
            const followers = acc.metadata?.followers_count
                || acc.metadata?.followersCount
                || acc.metadata?.fan_count
                || 0;
            return sum + Number(followers);
        }, 0);

        // 6. Trends - compare last 7 days vs previous 7 days

        // Comments trend: posts fetched in last 7 days vs previous 7 days
        const recentComments = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .andWhere('post.fetchedAt >= :sevenDaysAgo', { sevenDaysAgo })
            .select('SUM(post.commentsCount)', 'total')
            .getRawOne();
        const recentCommentsTotal = parseInt(recentComments?.total) || 0;

        const prevComments = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .andWhere('post.fetchedAt >= :fourteenDaysAgo', { fourteenDaysAgo })
            .andWhere('post.fetchedAt < :sevenDaysAgo', { sevenDaysAgo })
            .select('SUM(post.commentsCount)', 'total')
            .getRawOne();
        const prevCommentsTotal = parseInt(prevComments?.total) || 0;

        // Likes trend
        const recentLikes = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .andWhere('post.fetchedAt >= :sevenDaysAgo', { sevenDaysAgo })
            .select('SUM(post.likesCount)', 'total')
            .getRawOne();
        const recentLikesTotal = parseInt(recentLikes?.total) || 0;

        const prevLikes = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .andWhere('post.fetchedAt >= :fourteenDaysAgo', { fourteenDaysAgo })
            .andWhere('post.fetchedAt < :sevenDaysAgo', { sevenDaysAgo })
            .select('SUM(post.likesCount)', 'total')
            .getRawOne();
        const prevLikesTotal = parseInt(prevLikes?.total) || 0;

        // Automations trend
        const recentAutomations = await this.logsRepo.count({
            where: {
                userId,
                executedAt: MoreThanOrEqual(sevenDaysAgo),
            },
        });

        const prevAutomations = await this.logsRepo
            .createQueryBuilder('log')
            .where('log.userId = :userId', { userId })
            .andWhere('log.executedAt >= :fourteenDaysAgo', { fourteenDaysAgo })
            .andWhere('log.executedAt < :sevenDaysAgo', { sevenDaysAgo })
            .getCount();

        return {
            totalComments,
            totalLikes,
            automationsRun,
            successRate,
            reach,
            trends: {
                comments: this.calcTrend(recentCommentsTotal, prevCommentsTotal),
                likes: this.calcTrend(recentLikesTotal, prevLikesTotal),
                automations: this.calcTrend(recentAutomations, prevAutomations),
            },
        };
    }

    private calcTrend(current: number, previous: number): number {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Math.round(((current - previous) / previous) * 100);
    }

    async getAutomationStats(userId: string, automationId: string) {
        const logs = await this.logsRepo.find({
            where: { automationId, userId },
            order: { executedAt: 'DESC' },
            take: 100,
        });
        return logs;
    }
}
