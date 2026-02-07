import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { WhatsAppOtpService } from './services/whatsapp-otp.service';
import { EmailService } from './services/email.service';
import { User } from '../../entities/user.entity';

const BCRYPT_ROUNDS = 10;
const OTP_EXPIRY_MINUTES = 5;
const RESET_TOKEN_EXPIRY_HOURS = 1;

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private whatsAppOtpService: WhatsAppOtpService,
        private emailService: EmailService,
    ) {}

    async register(name: string, email: string, password: string, phone?: string): Promise<User> {
        const existing = await this.usersService.findByEmail(email);
        if (existing) {
            throw new ConflictException('Email já cadastrado');
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        return this.usersService.create({
            name,
            email,
            passwordHash,
            phone: phone || null,
        });
    }

    async login(email: string, password: string): Promise<User> {
        const user = await this.usersService.findByEmail(email);
        if (!user || !user.passwordHash) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new UnauthorizedException('Credenciais inválidas');
        }

        return user;
    }

    async requestOtp(email: string): Promise<{ message: string; whatsappSent: boolean }> {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            return { message: 'Nenhuma conta encontrada com este e-mail. Verifique ou cadastre-se.', whatsappSent: false };
        }

        if (!user.phone) {
            return { message: 'Nenhum telefone vinculado a esta conta. Utilize login com senha ou cadastre um telefone no perfil.', whatsappSent: false };
        }

        const code = String(randomInt(100000, 999999));
        const expires = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        user.otpCode = await bcrypt.hash(code, BCRYPT_ROUNDS);
        user.otpExpires = expires;
        await this.usersService.saveUser(user);

        const sent = await this.whatsAppOtpService.sendOtp(user.phone, code);

        if (!sent) {
            throw new BadRequestException('Não foi possível enviar o código via WhatsApp. Verifique se o telefone está cadastrado.');
        }

        return { message: 'Código OTP enviado com sucesso', whatsappSent: true };
    }

    async verifyOtp(email: string, otp: string): Promise<User> {
        const user = await this.usersService.findByEmail(email);

        if (!user || !user.otpCode || !user.otpExpires) {
            throw new UnauthorizedException('Código OTP inválido ou expirado');
        }

        if (new Date() > user.otpExpires) {
            // Limpa OTP expirado
            user.otpCode = null;
            user.otpExpires = null;
            await this.usersService.saveUser(user);
            throw new UnauthorizedException('Código OTP inválido ou expirado');
        }

        const valid = await bcrypt.compare(otp, user.otpCode);
        if (!valid) {
            throw new UnauthorizedException('Código OTP inválido ou expirado');
        }

        // Uso único: limpa OTP
        user.otpCode = null;
        user.otpExpires = null;
        await this.usersService.saveUser(user);

        return user;
    }

    async forgotPassword(email: string): Promise<{ message: string; sent: boolean; via?: string }> {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            return { message: 'Nenhuma conta encontrada com este e-mail. Verifique ou cadastre-se.', sent: false };
        }

        const resetToken = this.jwtService.sign(
            { sub: user.id, purpose: 'password-reset' },
            { expiresIn: `${RESET_TOKEN_EXPIRY_HOURS}h` },
        );

        user.resetToken = resetToken;
        user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
        await this.usersService.saveUser(user);

        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        // Primário: WhatsApp
        if (user.phone) {
            const sent = await this.whatsAppOtpService.sendResetLink(user.phone, resetUrl);
            if (sent) return { message: 'Link de redefinição enviado via WhatsApp.', sent: true, via: 'whatsapp' };
        }

        // Fallback: Email
        try {
            await this.emailService.sendResetEmail(user.email, resetUrl);
            return { message: 'Link de redefinição enviado para seu e-mail.', sent: true, via: 'email' };
        } catch {
            return { message: 'Não foi possível enviar o link de redefinição. Tente novamente mais tarde.', sent: false };
        }
    }

    async resetPassword(token: string, newPassword: string): Promise<void> {
        let payload: any;
        try {
            payload = this.jwtService.verify(token);
        } catch {
            throw new BadRequestException('Token inválido ou expirado');
        }

        if (payload.purpose !== 'password-reset') {
            throw new BadRequestException('Token inválido ou expirado');
        }

        const user = await this.usersService.findById(payload.sub);

        // Validação dupla: JWT + token no DB
        if (!user || user.resetToken !== token) {
            throw new BadRequestException('Token inválido ou expirado');
        }

        if (user.resetTokenExpires && new Date() > user.resetTokenExpires) {
            user.resetToken = null;
            user.resetTokenExpires = null;
            await this.usersService.saveUser(user);
            throw new BadRequestException('Token inválido ou expirado');
        }

        user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        // Uso único: limpa reset token
        user.resetToken = null;
        user.resetTokenExpires = null;
        await this.usersService.saveUser(user);
    }
}
