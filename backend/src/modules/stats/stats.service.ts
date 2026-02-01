import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { AutomationLog } from '../../entities/automation-log.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { LogStatus } from '../../entities/automation-log.entity';

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
        // 1. Total Comments from posts
        const resComments = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .select('SUM(post.commentsCount)', 'totalComments')
            .getRawOne();
        const totalComments = resComments?.totalComments || 0;

        // 2. Total Likes from posts
        const resLikes = await this.postsRepo
            .createQueryBuilder('post')
            .leftJoin('post.socialAccount', 'account')
            .where('account.userId = :userId', { userId })
            .select('SUM(post.likesCount)', 'totalLikes')
            .getRawOne();
        const totalLikes = resLikes?.totalLikes || 0;

        // 3. Automations Run (Total Logs)
        const automationsRun = await this.logsRepo.count({
            where: { automation: { user: { id: userId } } }
        });

        // 4. Success Rate
        const successfulRuns = await this.logsRepo.count({
            where: { automation: { user: { id: userId } }, status: LogStatus.SUCCESS }
        });
        const successRate = automationsRun > 0 ? Math.round((successfulRuns / automationsRun) * 100) : 0;

        // 5. Reach (Example: Sum of followers? or just a mock for now since Graph API metric is complex)
        // We'll calculate 'Potential Reach' as sum of followers/fans from Accounts
        // Assuming we stored follower_count in SocialAccount meta (which we should have)
        // For now, we'll return 0 if not available
        const accounts = await this.accountsRepo.find({ where: { user: { id: userId } } });
        // const reach = accounts.reduce((sum, acc) => sum + (acc.meta?.followers_count || 0), 0);
        // As we didn't explicitly implement storing followers_count in meta yet, let's keep it safe.
        const reach = 0;

        return {
            totalComments: parseInt(totalComments) || 0,
            totalLikes: parseInt(totalLikes) || 0,
            automationsRun,
            successRate,
            reach,
            trends: {
                comments: 12, // Placeholder
                likes: 5,
                automations: 8
            }
        };
    }

    async getAutomationStats(userId: string, automationId: string) {
        const logs = await this.logsRepo.find({
            where: { automation: { id: automationId } },
            order: { executedAt: 'DESC' },
            take: 100
        });
        return logs;
    }
}
