import { Controller, Get, Post, Patch, Body, Query, UseGuards, Request, Res, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { google } from 'googleapis';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { LoginDto, RegisterDto, RequestOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private jwtService: JwtService,
        private plansService: PlansService,
        private configService: ConfigService,
        private googleSheetsService: GoogleSheetsService,
    ) {}

    @Post('login')
    async login(@Body() dto: LoginDto) {
        const user = await this.authService.login(dto.email, dto.password);
        const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const user = await this.authService.register(dto.name, dto.email, dto.password, dto.phone);
        const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }

    @Post('otp')
    async requestOtp(@Body() dto: RequestOtpDto) {
        const data = await this.authService.requestOtp(dto.email);
        return { message: 'OTP enviado com sucesso', ...data };
    }

    @Post('otp/verify')
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        const user = await this.authService.verifyOtp(dto.email, dto.otp);
        const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
        return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }

    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        await this.authService.resetPassword(dto.token, dto.newPassword);
        return { message: 'Senha redefinida com sucesso!' };
    }

    @Get('google')
    async googleLogin(@Res() res: Response) {
        const client = this.createGoogleOAuth2Client();
        const state = Buffer.from(JSON.stringify({ type: 'login' })).toString('base64');

        const authUrl = client.generateAuthUrl({
            access_type: 'online',
            scope: ['email', 'profile'],
            state,
        });

        res.redirect(authUrl);
    }

    @Get('google-sheets')
    @UseGuards(JwtAuthGuard)
    async googleSheetsLogin(@Request() req, @Res() res: Response) {
        const authUrl = this.googleSheetsService.getAuthUrl(req.user.userId);
        this.logger.log(`Initiating Google Sheets OAuth for user ${req.user.userId}`);
        res.redirect(authUrl);
    }

    @Get('google/callback')
    async googleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://jolu.ai';

        if (error) {
            this.logger.error(`Google OAuth error: ${error}`);
            return res.redirect(`${frontendUrl}/oauth/callback?status=error&error=${encodeURIComponent(error)}`);
        }

        try {
            const stateData = state
                ? JSON.parse(Buffer.from(state, 'base64').toString())
                : { type: 'login' };

            if (stateData.type === 'google-sheets') {
                // Handle Google Sheets connection
                await this.googleSheetsService.handleCallback(code, stateData.userId);
                this.logger.log(`Google Sheets connected for user ${stateData.userId}`);
                return res.redirect(`${frontendUrl}/oauth/callback?status=success&platform=google-sheets`);
            }

            // Handle login
            const client = this.createGoogleOAuth2Client();
            const { tokens } = await client.getToken(code);
            client.setCredentials(tokens);

            const oauth2 = google.oauth2({ version: 'v2', auth: client });
            const { data: userInfo } = await oauth2.userinfo.get();

            const user = await this.authService.loginOrRegisterWithGoogle({
                email: userInfo.email,
                name: userInfo.name || '',
                picture: userInfo.picture || null,
                googleId: userInfo.id,
            });

            const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
            res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
        } catch (err) {
            this.logger.error('Google OAuth callback error', err);
            return res.redirect(`${frontendUrl}/oauth/callback?status=error&error=${encodeURIComponent('Falha na autenticação com Google')}`);
        }
    }

    private createGoogleOAuth2Client() {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_CALLBACK_URL');
        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        const { userId, email } = req.user;
        const user = await this.usersService.findOrCreateByEmail(email);
        const activeModules = await this.plansService.getActiveModules(user.id);
        const userModule = await this.plansService.getUserModules(user.id);
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            activeModules,
            hasActiveSubscription: !!userModule?.planId,
        };
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
        const { userId } = req.user;
        const user = await this.authService.updateProfile(userId, dto);
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
    }
}
