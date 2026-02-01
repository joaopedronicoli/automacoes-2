import {
    Controller,
    Get,
    Query,
    UseGuards,
    Request,
    Res,
    Logger,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FacebookService } from './facebook.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { UsersService } from '../../users/users.service';
import { SocialPlatform } from '../../../entities/social-account.entity';

@Controller('auth/facebook')
export class FacebookAuthController {
    private readonly logger = new Logger(FacebookAuthController.name);

    constructor(
        private configService: ConfigService,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
        private usersService: UsersService,
    ) { }

    /**
     * Initiate Facebook OAuth flow
     * GET /api/auth/facebook
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async initiateOAuth(@Request() req, @Res() res: Response) {
        // Ensure user exists in local DB (Supabase-managed users)
        await this.usersService.findOrCreateFromSupabase(req.user.userId, req.user.email);

        const appId = this.configService.get('FACEBOOK_APP_ID');
        const redirectUri = this.configService.get('FACEBOOK_CALLBACK_URL');
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

        // Required permissions for Facebook Pages and Instagram
        const scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_messaging',
            'pages_manage_metadata',
            'pages_read_user_content',
            'instagram_basic',
            'instagram_manage_comments',
            'instagram_manage_messages',
            'instagram_content_publish',
        ].join(',');

        // Store user ID in state for security
        const state = Buffer.from(
            JSON.stringify({
                userId: req.user.userId,
                timestamp: Date.now(),
            }),
        ).toString('base64');

        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
            redirectUri,
        )}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`;

        this.logger.log(`Initiating OAuth for user ${req.user.userId}`);

        // Redirect to Facebook OAuth
        return res.redirect(authUrl);
    }

    /**
     * Handle Facebook OAuth callback
     * GET /api/auth/facebook/callback
     */
    @Get('callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Query('error_description') errorDescription: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

        // Handle OAuth errors
        if (error) {
            this.logger.error(`OAuth error: ${error} - ${errorDescription}`);
            return res.redirect(`${frontendUrl}/accounts?error=${encodeURIComponent(errorDescription || error)}`);
        }

        // Validate state parameter
        if (!state) {
            this.logger.error('Missing state parameter');
            return res.redirect(`${frontendUrl}/accounts?error=invalid_state`);
        }

        let stateData: { userId: string; timestamp: number };
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
        } catch (err) {
            this.logger.error('Invalid state parameter');
            return res.redirect(`${frontendUrl}/accounts?error=invalid_state`);
        }

        // Check state timestamp (prevent replay attacks - 10 min window)
        if (Date.now() - stateData.timestamp > 600000) {
            this.logger.error('State parameter expired');
            return res.redirect(`${frontendUrl}/accounts?error=state_expired`);
        }

        if (!code) {
            this.logger.error('Missing authorization code');
            return res.redirect(`${frontendUrl}/accounts?error=missing_code`);
        }

        try {
            // Step 1: Exchange code for access token
            const shortLivedToken = await this.facebookService.exchangeCodeForToken(code);

            // Step 2: Exchange for long-lived token (60 days)
            const { access_token: longLivedToken, expires_in } = await this.facebookService.getLongLivedToken(
                shortLivedToken,
            );

            // Step 3: Get user's Facebook Pages
            const pages = await this.facebookService.getUserPages(longLivedToken);

            if (!pages || pages.length === 0) {
                this.logger.warn(`No pages found for user ${stateData.userId}`);
                return res.redirect(`${frontendUrl}/accounts?error=no_pages_found`);
            }

            this.logger.log(`Found ${pages.length} pages for user ${stateData.userId}`);

            // Step 4: Save each page as a social account
            const savedAccounts = [];

            for (const page of pages) {
                try {
                    // Check if page already connected
                    const existingAccounts = await this.socialAccountsService.findByUser(stateData.userId);
                    const alreadyConnected = existingAccounts.some(
                        (acc) => acc.platform === SocialPlatform.FACEBOOK && acc.accountId === page.id,
                    );

                    if (alreadyConnected) {
                        this.logger.log(`Page ${page.id} already connected, updating token`);
                        // Update token for existing account
                        const existingAccount = existingAccounts.find(
                            (acc) => acc.platform === SocialPlatform.FACEBOOK && acc.accountId === page.id,
                        );

                        if (existingAccount) {
                            const expiresAt = new Date(Date.now() + expires_in * 1000);
                            await this.socialAccountsService.updateTokens(
                                existingAccount.id,
                                page.access_token,
                                null,
                                expiresAt,
                            );
                        }
                        continue;
                    }

                    // Save new Facebook Page account
                    const expiresAt = new Date(Date.now() + expires_in * 1000);

                    const account = await this.socialAccountsService.create({
                        userId: stateData.userId,
                        platform: SocialPlatform.FACEBOOK,
                        accountId: page.id,
                        accountName: page.name,
                        accountUsername: null,
                        profilePictureUrl: null,
                        accessToken: page.access_token, // Will be encrypted by service
                        refreshToken: null,
                        tokenExpiresAt: expiresAt,
                        status: 'active' as any,
                        metadata: {
                            category: page.category,
                            tasks: page.tasks || [],
                        },
                    });

                    // Subscribe to webhooks for this page
                    await this.facebookService.subscribeToPageWebhooks(page.id, page.access_token);

                    savedAccounts.push({ platform: 'facebook', name: page.name, id: account.id });

                    // Step 5: Check for Instagram Business Account
                    if (page.instagram_business_account?.id) {
                        const instagramId = page.instagram_business_account.id;

                        this.logger.log(`Found Instagram account ${instagramId} for page ${page.id}`);

                        try {
                            // Get Instagram account details
                            const instagramAccount = await this.facebookService.getInstagramAccount(
                                instagramId,
                                page.access_token,
                            );

                            // Check if Instagram account already connected
                            const instagramExists = existingAccounts.some(
                                (acc) => acc.platform === SocialPlatform.INSTAGRAM && acc.accountId === instagramId,
                            );

                            if (!instagramExists) {
                                const instagramAccountRecord = await this.socialAccountsService.create({
                                    userId: stateData.userId,
                                    platform: SocialPlatform.INSTAGRAM,
                                    accountId: instagramId,
                                    accountName: instagramAccount.name || instagramAccount.username,
                                    accountUsername: instagramAccount.username,
                                    profilePictureUrl: instagramAccount.profile_picture_url,
                                    accessToken: page.access_token, // Same token as page
                                    refreshToken: null,
                                    tokenExpiresAt: expiresAt,
                                    status: 'active' as any,
                                    metadata: {
                                        followers_count: instagramAccount.followers_count,
                                        follows_count: instagramAccount.follows_count,
                                        media_count: instagramAccount.media_count,
                                        linked_page_id: page.id,
                                    },
                                });

                                savedAccounts.push({
                                    platform: 'instagram',
                                    name: instagramAccount.username,
                                    id: instagramAccountRecord.id,
                                });
                            }
                        } catch (err) {
                            this.logger.error(`Failed to save Instagram account ${instagramId}`, err);
                            // Continue with other accounts
                        }
                    }
                } catch (err) {
                    this.logger.error(`Failed to save page ${page.id}`, err);
                    // Continue with other pages
                }
            }

            this.logger.log(`Successfully connected ${savedAccounts.length} accounts for user ${stateData.userId}`);

            // Redirect back to frontend with success
            const accountsParam = encodeURIComponent(JSON.stringify(savedAccounts));
            return res.redirect(`${frontendUrl}/accounts?success=true&accounts=${accountsParam}`);
        } catch (error) {
            this.logger.error('OAuth callback failed', error);
            return res.redirect(
                `${frontendUrl}/accounts?error=${encodeURIComponent(error.message || 'connection_failed')}`,
            );
        }
    }

    /**
     * Manually refresh account tokens
     * POST /api/auth/facebook/refresh/:accountId
     */
    @Get('refresh/:accountId')
    @UseGuards(JwtAuthGuard)
    async refreshToken(@Request() req, @Query('accountId') accountId: string) {
        try {
            const account = await this.socialAccountsService.findById(accountId);

            if (!account || account.userId !== req.user.userId) {
                throw new BadRequestException('Account not found');
            }

            if (account.platform !== SocialPlatform.FACEBOOK) {
                throw new BadRequestException('Only Facebook accounts can be refreshed');
            }

            // Validate current token
            const isValid = await this.facebookService.validateToken(account.accessToken);

            if (!isValid) {
                throw new BadRequestException('Token is invalid and cannot be refreshed automatically');
            }

            // Try to get new long-lived token
            const { access_token, expires_in } = await this.facebookService.getLongLivedToken(
                account.accessToken,
            );

            const expiresAt = new Date(Date.now() + expires_in * 1000);

            await this.socialAccountsService.updateTokens(accountId, access_token, null, expiresAt);

            this.logger.log(`Refreshed token for account ${accountId}`);

            return {
                success: true,
                expiresAt,
            };
        } catch (error) {
            this.logger.error(`Failed to refresh token for account ${accountId}`, error);
            throw new InternalServerErrorException('Failed to refresh token');
        }
    }

    /**
     * Get OAuth URL (for manual flow)
     * GET /api/auth/facebook/url
     */
    @Get('url')
    @UseGuards(JwtAuthGuard)
    getOAuthUrl(@Request() req) {
        const appId = this.configService.get('FACEBOOK_APP_ID');
        const redirectUri = this.configService.get('FACEBOOK_CALLBACK_URL');

        const scopes = [
            'pages_manage_posts',
            'pages_read_engagement',
            'pages_messaging',
            'pages_manage_metadata',
            'pages_read_user_content',
            'instagram_basic',
            'instagram_manage_comments',
            'instagram_manage_messages',
            'instagram_content_publish',
        ].join(',');

        const state = Buffer.from(
            JSON.stringify({
                userId: req.user.userId,
                timestamp: Date.now(),
            }),
        ).toString('base64');

        const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
            redirectUri,
        )}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`;

        return { url: authUrl };
    }
}
