import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { SocialAccountsModule } from '../../social-accounts/social-accounts.module';

@Module({
    imports: [
        ConfigModule,
        SocialAccountsModule,
    ],
    providers: [WhatsAppService],
    controllers: [WhatsAppController],
    exports: [WhatsAppService],
})
export class WhatsAppModule {}
