import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthService {
    private readonly pelgUrl: string;
    private readonly pelgApiKey: string;

    constructor(private configService: ConfigService) {
        this.pelgUrl = this.configService.get<string>('PELG_AUTH_URL');
        this.pelgApiKey = this.configService.get<string>('PELG_API_KEY');
    }

    async login(email: string, password: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/login`,
                { email, password },
                { headers: { 'x-api-key': this.pelgApiKey } },
            );
            return data;
        } catch (error) {
            throw new UnauthorizedException(
                error?.response?.data?.message || 'Credenciais inválidas',
            );
        }
    }

    async register(name: string, email: string, password: string, phone?: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/register`,
                { name, email, password, ...(phone && { phone }) },
                { headers: { 'x-api-key': this.pelgApiKey } },
            );
            return data;
        } catch (error) {
            throw new UnauthorizedException(
                error?.response?.data?.message || 'Falha ao registrar',
            );
        }
    }

    async requestOtp(email: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/request-otp`,
                { email },
                { headers: { 'x-api-key': this.pelgApiKey } },
            );
            return data;
        } catch (error) {
            throw new UnauthorizedException(
                error?.response?.data?.message || 'Falha ao solicitar OTP',
            );
        }
    }

    async verifyOtp(email: string, otp: string) {
        try {
            const { data } = await axios.post(
                `${this.pelgUrl}/api/v1/auth/verify-otp`,
                { email, otp },
                { headers: { 'x-api-key': this.pelgApiKey } },
            );
            return data;
        } catch (error) {
            throw new UnauthorizedException(
                error?.response?.data?.message || 'Código OTP inválido',
            );
        }
    }
}
