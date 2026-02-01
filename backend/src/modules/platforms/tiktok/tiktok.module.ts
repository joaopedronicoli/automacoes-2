import { Module } from '@nestjs/common';
import { TiktokController } from './tiktok.controller';
import { TiktokService } from './tiktok.service';
import { SocialAccountsModule } from '../../../social-accounts/social-accounts.module';

@Module({
    imports: [SocialAccountsModule],
    controllers: [TiktokController],
    providers: [TiktokService],
    exports: [TiktokService]
})
export class TiktokModule { }
