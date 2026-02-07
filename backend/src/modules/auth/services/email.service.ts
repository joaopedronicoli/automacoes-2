import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

const TIMEOUT = 15000;

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;

    constructor(private configService: ConfigService) {
        const host = this.configService.get<string>('SMTP_HOST');
        const port = this.configService.get<number>('SMTP_PORT');
        const user = this.configService.get<string>('SMTP_USER');
        const pass = this.configService.get<string>('SMTP_PASS');

        if (host && user && pass) {
            this.transporter = nodemailer.createTransport({
                host,
                port: port || 587,
                secure: port === 465,
                auth: { user, pass },
                connectionTimeout: TIMEOUT,
                greetingTimeout: TIMEOUT,
                socketTimeout: TIMEOUT,
            });
            this.logger.log('SMTP transport configurado');
        } else {
            this.logger.warn('SMTP não configurado — envio de email desabilitado');
        }
    }

    async sendResetEmail(to: string, resetUrl: string): Promise<boolean> {
        if (!this.transporter) {
            this.logger.warn('Tentativa de envio de email sem SMTP configurado');
            return false;
        }

        const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');

        try {
            await this.transporter.sendMail({
                from,
                to,
                subject: 'Redefinição de senha',
                html: `
                    <p>Você solicitou a redefinição de sua senha.</p>
                    <p>Clique no link abaixo para criar uma nova senha:</p>
                    <p><a href="${resetUrl}">${resetUrl}</a></p>
                    <p>Este link expira em 1 hora.</p>
                    <p>Se você não solicitou esta redefinição, ignore este email.</p>
                `,
            });
            return true;
        } catch (error) {
            this.logger.error(`Falha ao enviar email para ${to}: ${error.message}`);
            return false;
        }
    }
}
