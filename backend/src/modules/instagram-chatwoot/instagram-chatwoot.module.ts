import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstagramChatwootService } from './instagram-chatwoot.service';
import { InstagramChatwootWebhookController } from './instagram-chatwoot-webhook.controller';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { SocialAccountsModule } from '../social-accounts/social-accounts.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
    imports: [
        ConfigModule,
        ChatwootModule,
        forwardRef(() => FacebookModule),
        SocialAccountsModule,
        forwardRef(() => IntegrationsModule),
    ],
    controllers: [InstagramChatwootWebhookController],
    providers: [InstagramChatwootService],
    exports: [InstagramChatwootService],
})
export class InstagramChatwootModule {}
