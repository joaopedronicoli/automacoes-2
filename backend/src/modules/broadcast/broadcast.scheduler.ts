import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BroadcastService } from './broadcast.service';

@Injectable()
export class BroadcastScheduler {
    private readonly logger = new Logger(BroadcastScheduler.name);

    constructor(private broadcastService: BroadcastService) {}

    /**
     * Check for scheduled broadcasts every minute
     * Starts any broadcasts that are due
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkScheduledBroadcasts() {
        try {
            const dueBroadcasts = await this.broadcastService.findDueScheduledBroadcasts();

            if (dueBroadcasts.length === 0) {
                return;
            }

            this.logger.log(`Found ${dueBroadcasts.length} scheduled broadcasts to start`);

            for (const broadcast of dueBroadcasts) {
                try {
                    // Check time window before starting — if outside window, pause instead
                    if (!this.broadcastService.isWithinTimeWindow(broadcast)) {
                        this.logger.log(`Scheduled broadcast ${broadcast.id} is outside time window, setting to paused`);
                        await this.broadcastService.pauseBroadcast(broadcast.id);
                        continue;
                    }

                    await this.broadcastService.start(broadcast.id, broadcast.userId);
                    this.logger.log(`Started scheduled broadcast ${broadcast.id}: ${broadcast.name}`);
                } catch (error) {
                    this.logger.error(`Failed to start scheduled broadcast ${broadcast.id}`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error checking scheduled broadcasts', error);
        }
    }

    /**
     * Check for paused broadcasts every minute
     * Resumes broadcasts that are within their time window
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkPausedBroadcasts() {
        try {
            const pausedBroadcasts = await this.broadcastService.findPausedBroadcasts();

            if (pausedBroadcasts.length === 0) {
                return;
            }

            this.logger.log(`Found ${pausedBroadcasts.length} paused broadcasts to check`);

            for (const broadcast of pausedBroadcasts) {
                try {
                    if (this.broadcastService.isWithinTimeWindow(broadcast)) {
                        await this.broadcastService.resumeBroadcast(broadcast.id, true);
                        this.logger.log(`Auto-resumed broadcast ${broadcast.id}: ${broadcast.name}`);
                    }
                } catch (error) {
                    this.logger.error(`Failed to auto-resume broadcast ${broadcast.id}`, error);
                }
            }
        } catch (error) {
            this.logger.error('Error checking paused broadcasts', error);
        }
    }
}
