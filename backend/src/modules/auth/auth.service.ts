import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const TIMEOUT = 15000; // 15 segundos

@Injectable()
export class AuthService {
    private readonly pelgUrl: string;
    private readonly pelgApiKey: string;

    constructor(private configService: ConfigService) {
        this.pelgUrl = this.configService.get<string>('PELG_AUTH_URL');
        this.pelgApiKey = this.configService.get<string>('PELG_API_KEY');
    }

    private get headers() {
        return { 'x-api-key': this.pelgApiKey };
    }

    async login(email: string, password: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/login`,
                { email, password },
                { headers: this.headers, timeout: TIMEOUT },
            );
            return data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new UnauthorizedException(
                error?.response?.data?.message || error?.response?.data?.error || 'Credenciais inválidas',
            );
        }
    }

    async register(name: string, email: string, password: string, phone?: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/register`,
                { name, email, password, ...(phone && { phone }) },
                { headers: this.headers, timeout: TIMEOUT },
            );
            return data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new BadRequestException(
                error?.response?.data?.message || error?.response?.data?.error || 'Falha ao registrar',
            );
        }
    }

    async requestOtp(email: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/request-otp`,
                { email },
                { headers: this.headers, timeout: TIMEOUT },
            );
            if (data.whatsappSent === false) {
                throw new BadRequestException('Não foi possível enviar o código via WhatsApp. Verifique se o telefone está cadastrado.');
            }
            return data;
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new BadRequestException(
                error?.response?.data?.message || error?.response?.data?.error || 'Falha ao solicitar OTP',
            );
        }
    }

    async verifyOtp(email: string, otp: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/verify-otp`,
                { email, otp },
                { headers: this.headers, timeout: TIMEOUT },
            );
            return data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new UnauthorizedException(
                error?.response?.data?.message || error?.response?.data?.error || 'Código OTP inválido ou expirado',
            );
        }
    }

    async forgotPassword(email: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/auth/forgot-password`,
                { email, sendVia: 'whatsapp' },
                { timeout: TIMEOUT },
            );
            return data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new BadRequestException(
                error?.response?.data?.message || error?.response?.data?.error || 'Falha ao solicitar redefinição de senha',
            );
        }
    }

    async resetPassword(token: string, newPassword: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/auth/reset-password`,
                { token, newPassword },
                { timeout: TIMEOUT },
            );
            return data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new BadRequestException('Servidor de autenticação não respondeu a tempo');
            }
            throw new BadRequestException(
                error?.response?.data?.message || error?.response?.data?.error || 'Falha ao redefinir senha',
            );
        }
    }
}
