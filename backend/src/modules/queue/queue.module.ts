import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationProcessor } from './processors/automation.processor';
import { AutomationsModule } from '../automations/automations.module';
import { PostsModule } from '../posts/posts.module';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { LogsModule } from '../logs/logs.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: 'automations',
            limiter: {
                max: 5, // 5 jobs
                duration: 1000, // per second
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
            }
        }),
        AutomationsModule,
        PostsModule,
        FacebookModule,
        LogsModule,
        SocialAccountsModule,
    ],
    providers: [AutomationProcessor],
    exports: [BullModule],
})
export class QueueModule { }
