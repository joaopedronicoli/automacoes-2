import { Controller, Get, Post, Patch, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { LoginDto, RegisterDto, RequestOtpDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private jwtService: JwtService,
        private plansService: PlansService,
        private configService: ConfigService,
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
    @UseGuards(AuthGuard('google-auth'))
    async googleLogin() {
        // Passport redirects to Google
    }

    @Get('google/callback')
    @UseGuards(AuthGuard('google-auth'))
    async googleCallback(@Request() req, @Res() res: Response) {
        const user = await this.authService.loginOrRegisterWithGoogle(req.user);
        const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://jolu.ai';
        res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        const { userId, email } = req.user;
        const user = await this.usersService.findOrCreateByEmail(email);
        const activeModules = await this.plansService.getActiveModules(user.id);
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, activeModules };
    }

    @Patch('profile')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
        const { userId } = req.user;
        const user = await this.authService.updateProfile(userId, dto);
        return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role };
    }
}
