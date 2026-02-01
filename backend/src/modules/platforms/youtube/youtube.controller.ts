import { Controller, Get, Req, UseGuards, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';

@Controller('auth/google')
export class YoutubeController {
    constructor(
        private configService: ConfigService,
        private socialAccountsService: SocialAccountsService
    ) { }

    @Get()
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) {
        // Guard handles redirect
    }

    @Get('callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res) {
        const socialUser = req.user;

        // We expect state to contain the userId of the app user connecting the account
        // Or we decode it if we passed it encoded
        const userId = req.query.state;

        if (userId) {
            // Connect account
            await this.socialAccountsService.findOrCreate({
                userId: userId,
                platform: 'youtube',
                platformUserId: socialUser.socialId,
                accountName: `${socialUser.firstName} ${socialUser.lastName}`,
                accessToken: socialUser.accessToken,
                refreshToken: socialUser.refreshToken,
                tokenExpiresAt: new Date(Date.now() + 3600 * 1000) // Approx
            });

            return res.redirect(`${this.configService.get('FRONTEND_URL')}/oauth/callback?status=success&platform=youtube`);
        } else {
            // Login flow (optional, if we supported "Login with Google")
            return res.redirect(`${this.configService.get('FRONTEND_URL')}/login?error=no_user_state`);
        }
    }
}
