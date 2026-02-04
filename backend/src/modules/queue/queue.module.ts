import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationProcessor } from './processors/automation.processor';
import { BroadcastProcessor } from './processors/broadcast.processor';
import { AutomationsModule } from '../automations/automations.module';
import { PostsModule } from '../posts/posts.module';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { WhatsAppModule } from '../platforms/whatsapp/whatsapp.module';
import { BroadcastModule } from '../broadcast/broadcast.module';
import { LogsModule } from '../logs/logs.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { InstagramChatwootModule } from '../instagram-chatwoot/instagram-chatwoot.module';

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
        BullModule.registerQueue({
            name: 'broadcast',
            limiter: {
                max: 10, // 10 jobs per second (WhatsApp rate limit)
                duration: 1000,
            },
            defaultJobOptions: {
                attempts: 1,
                removeOnComplete: false,
            },
        }),
        forwardRef(() => AutomationsModule),
        forwardRef(() => PostsModule),
        forwardRef(() => FacebookModule),
        forwardRef(() => WhatsAppModule),
        forwardRef(() => BroadcastModule),
        LogsModule,
        SocialAccountsModule,
        IntegrationsModule,
        ChatwootModule,
        forwardRef(() => InstagramChatwootModule),
    ],
    providers: [AutomationProcessor, BroadcastProcessor],
    exports: [BullModule],
})
export class QueueModule { }
