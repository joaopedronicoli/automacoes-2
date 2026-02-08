import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { google, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Integration, IntegrationType, IntegrationStatus } from '../../entities/integration.entity';

@Injectable()
export class GoogleSheetsService {
    private readonly logger = new Logger(GoogleSheetsService.name);

    constructor(
        private configService: ConfigService,
        @InjectRepository(Integration)
        private integrationRepo: Repository<Integration>,
    ) {}

    createOAuth2Client(): OAuth2Client {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const redirectUri = this.configService.get('GOOGLE_CALLBACK_URL');

        return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    }

    getAuthUrl(userId: string): string {
        const client = this.createOAuth2Client();

        const state = Buffer.from(
            JSON.stringify({ userId, timestamp: Date.now() }),
        ).toString('base64');

        return client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: [
                'https://www.googleapis.com/auth/spreadsheets.readonly',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ],
            state,
        });
    }

    async handleCallback(code: string, userId: string): Promise<void> {
        const client = this.createOAuth2Client();
        const { tokens } = await client.getToken(code);

        client.setCredentials(tokens);

        // Get user email
        const oauth2 = google.oauth2({ version: 'v2', auth: client });
        const { data: userInfo } = await oauth2.userinfo.get();
        const email = userInfo.email || 'unknown';

        // Upsert integration
        let integration = await this.integrationRepo.findOne({
            where: { userId, type: IntegrationType.GOOGLE_SHEETS },
        });

        if (integration) {
            integration.consumerKey = tokens.access_token || '';
            integration.consumerSecret = tokens.refresh_token || integration.consumerSecret;
            integration.status = IntegrationStatus.ACTIVE;
            integration.metadata = {
                email,
                tokenExpiresAt: tokens.expiry_date,
            };
        } else {
            integration = this.integrationRepo.create({
                userId,
                type: IntegrationType.GOOGLE_SHEETS,
                name: `Google Sheets (${email})`,
                consumerKey: tokens.access_token || '',
                consumerSecret: tokens.refresh_token || '',
                status: IntegrationStatus.ACTIVE,
                metadata: {
                    email,
                    tokenExpiresAt: tokens.expiry_date,
                },
            });
        }

        await this.integrationRepo.save(integration);
        this.logger.log(`Google Sheets connected for user ${userId} (${email})`);
    }

    async findActiveByUser(userId: string): Promise<Integration | null> {
        return this.integrationRepo.findOne({
            where: {
                userId,
                type: IntegrationType.GOOGLE_SHEETS,
                status: IntegrationStatus.ACTIVE,
            },
        });
    }

    async disconnect(userId: string): Promise<void> {
        await this.integrationRepo.delete({
            userId,
            type: IntegrationType.GOOGLE_SHEETS,
        });
        this.logger.log(`Google Sheets disconnected for user ${userId}`);
    }

    getSheetsClient(integration: Integration): sheets_v4.Sheets {
        const client = this.createOAuth2Client();

        client.setCredentials({
            access_token: integration.consumerKey,
            refresh_token: integration.consumerSecret,
        });

        // Auto-refresh: update tokens in DB when refreshed
        client.on('tokens', async (tokens) => {
            try {
                if (tokens.access_token) {
                    integration.consumerKey = tokens.access_token;
                }
                if (tokens.refresh_token) {
                    integration.consumerSecret = tokens.refresh_token;
                }
                integration.metadata = {
                    ...integration.metadata,
                    tokenExpiresAt: tokens.expiry_date,
                };
                await this.integrationRepo.save(integration);
                this.logger.log(`Refreshed Google tokens for user ${integration.userId}`);
            } catch (err) {
                this.logger.error('Failed to save refreshed tokens', err);
            }
        });

        return google.sheets({ version: 'v4', auth: client });
    }

    extractSpreadsheetId(url: string): string {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            throw new BadRequestException('URL da planilha invalida. Use o formato: https://docs.google.com/spreadsheets/d/...');
        }
        return match[1];
    }

    async listTabs(
        userId: string,
        spreadsheetUrl: string,
    ): Promise<Array<{ title: string; index: number; rowCount: number }>> {
        const integration = await this.findActiveByUser(userId);
        if (!integration) {
            throw new BadRequestException('Google Sheets nao conectado');
        }

        const sheets = this.getSheetsClient(integration);
        const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);

        const { data } = await sheets.spreadsheets.get({ spreadsheetId });

        return (data.sheets || []).map((sheet) => ({
            title: sheet.properties?.title || 'Sem titulo',
            index: sheet.properties?.index || 0,
            rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        }));
    }

    async fetchSheetAsCSV(
        userId: string,
        spreadsheetUrl: string,
        sheetName: string,
    ): Promise<string> {
        const integration = await this.findActiveByUser(userId);
        if (!integration) {
            throw new BadRequestException('Google Sheets nao conectado');
        }

        const sheets = this.getSheetsClient(integration);
        const spreadsheetId = this.extractSpreadsheetId(spreadsheetUrl);

        const { data } = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: sheetName,
        });

        const rows = data.values;
        if (!rows || rows.length === 0) {
            throw new BadRequestException('A aba selecionada esta vazia');
        }

        // Convert rows to CSV string
        const csvLines = rows.map((row) =>
            row
                .map((cell) => {
                    const str = String(cell ?? '');
                    // Escape fields containing commas, quotes, or newlines
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                })
                .join(','),
        );

        return csvLines.join('\n');
    }
}
