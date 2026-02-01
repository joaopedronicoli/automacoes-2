import { Controller, Get, Req, Res, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TiktokService } from './tiktok.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';

@Controller('auth/tiktok')
export class TiktokController {
    constructor(
        private configService: ConfigService,
        private tiktokService: TiktokService,
        private socialAccountsService: SocialAccountsService
    ) { }

    @Get()
    async tiktokAuth(@Query('userId') userId: string, @Res() res) {
        if (!userId) return res.status(400).send('Missing userId');
        const url = this.tiktokService.getAuthUrl(userId);
        res.redirect(url);
    }

    @Get('callback')
    async tiktokAuthRedirect(@Query('code') code: string, @Query('state') state: string, @Res() res) {
        if (!code) return res.redirect(`${this.configService.get('FRONTEND_URL')}/oauth/callback?error=no_code`);

        try {
            const tokenData = await this.tiktokService.getAccessToken(code);
            const userInfo = await this.tiktokService.getUserInfo(tokenData.access_token);

            // Save account
            await this.socialAccountsService.findOrCreate({
                userId: state, // state contained userId
                platform: 'tiktok',
                platformUserId: userInfo.open_id,
                accountName: userInfo.display_name,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
            });

            return res.redirect(`${this.configService.get('FRONTEND_URL')}/oauth/callback?status=success&platform=tiktok`);
        } catch (error) {
            console.error('TikTok Auth Error', error);
            return res.redirect(`${this.configService.get('FRONTEND_URL')}/oauth/callback?error=tiktok_failed`);
        }
    }
}
