import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsSyncService } from './posts.sync.service';

@Injectable()
export class PostsScheduler {
    private readonly logger = new Logger(PostsScheduler.name);

    constructor(private postsSyncService: PostsSyncService) { }

    @Cron(CronExpression.EVERY_15_MINUTES)
    async handleCron() {
        this.logger.log('Running scheduled posts synchronization...');
        try {
            await this.postsSyncService.syncAllAccounts();
            this.logger.log('Scheduled synchronization completed.');
        } catch (error) {
            this.logger.error('Scheduled synchronization failed', error);
        }
    }
}
