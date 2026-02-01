import { Module } from '@nestjs/common';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { SocialAccountsModule } from '../../../social-accounts/social-accounts.module';

@Module({
    imports: [SocialAccountsModule],
    controllers: [YoutubeController],
    providers: [YoutubeService, GoogleStrategy],
    exports: [YoutubeService]
})
export class YoutubeModule { }
