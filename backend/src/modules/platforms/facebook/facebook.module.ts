import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FacebookService } from './facebook.service';
import { FacebookAuthController } from './facebook-auth.controller';
import { FacebookWebhooksController } from './facebook-webhooks.controller';
import { SocialAccountsModule } from '../../social-accounts/social-accounts.module';
import { UsersModule } from '../../users/users.module';
import { PostsModule } from '../../posts/posts.module';
import { AutomationsModule } from '../../automations/automations.module';
import { QueueModule } from '../../queue/queue.module';

@Module({
    imports: [
        ConfigModule,
        SocialAccountsModule,
        UsersModule,
        PostsModule,
        AutomationsModule,
        QueueModule,
    ],
    providers: [FacebookService],
    controllers: [FacebookAuthController, FacebookWebhooksController],
    exports: [FacebookService],
})
export class FacebookModule { }
