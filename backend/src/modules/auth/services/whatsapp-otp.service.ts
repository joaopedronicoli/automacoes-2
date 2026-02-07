import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const TIMEOUT = 15000;

@Injectable()
export class WhatsAppOtpService {
    private readonly logger = new Logger(WhatsAppOtpService.name);
    private readonly accessToken: string;
    private readonly phoneNumberId: string;

    constructor(private configService: ConfigService) {
        this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
        this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    }

    private get baseUrl(): string {
        return `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
        };
    }

    async sendOtp(phone: string, code: string): Promise<boolean> {
        try {
            await axios.post(
                this.baseUrl,
                {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: {
                        name: 'otp_code',
                        language: { code: 'pt_BR' },
                        components: [
                            {
                                type: 'body',
                                parameters: [{ type: 'text', text: code }],
                            },
                        ],
                    },
                },
                { headers: this.headers, timeout: TIMEOUT },
            );
            return true;
        } catch (error) {
            this.logger.error(`Falha ao enviar OTP via WhatsApp para ${phone}: ${error.message}`);
            return false;
        }
    }

    async sendResetLink(phone: string, resetUrl: string): Promise<boolean> {
        try {
            await axios.post(
                this.baseUrl,
                {
                    messaging_product: 'whatsapp',
                    to: phone,
                    type: 'template',
                    template: {
                        name: 'password_reset',
                        language: { code: 'pt_BR' },
                        components: [
                            {
                                type: 'body',
                                parameters: [{ type: 'text', text: resetUrl }],
                            },
                        ],
                    },
                },
                { headers: this.headers, timeout: TIMEOUT },
            );
            return true;
        } catch (error) {
            this.logger.error(`Falha ao enviar link de reset via WhatsApp para ${phone}: ${error.message}`);
            return false;
        }
    }
}
