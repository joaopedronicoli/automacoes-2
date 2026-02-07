import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto, RegisterDto, RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    @Post('login')
    async login(@Body() dto: LoginDto) {
        const pelgData = await this.authService.login(dto.email, dto.password);
        const pelgName = pelgData?.user?.name;
        const user = await this.usersService.findOrCreateByEmail(dto.email, pelgName);
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        await this.authService.register(dto.name, dto.email, dto.password, dto.phone);
        const user = await this.usersService.findOrCreateByEmail(dto.email, dto.name);
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    @Post('otp')
    async requestOtp(@Body() dto: RequestOtpDto) {
        const data = await this.authService.requestOtp(dto.email);
        return { message: 'OTP enviado com sucesso', ...data };
    }

    @Post('otp/verify')
    async verifyOtp(@Body() dto: VerifyOtpDto) {
        const pelgData = await this.authService.verifyOtp(dto.email, dto.otp);
        const pelgName = pelgData?.user?.name;
        const user = await this.usersService.findOrCreateByEmail(dto.email, pelgName);
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return { token, user: { id: user.id, email: user.email, name: user.name } };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@Request() req) {
        const { userId, email } = req.user;
        const user = await this.usersService.findOrCreateByEmail(email);
        return { id: user.id, email: user.email, name: user.name };
    }
}
