import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Query,
    UseGuards,
    Request,
    Res,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoogleSheetsService } from './google-sheets.service';
import { BroadcastService } from '../broadcast/broadcast.service';

@Controller()
export class GoogleSheetsController {
    private readonly logger = new Logger(GoogleSheetsController.name);

    constructor(
        private configService: ConfigService,
        private googleSheetsService: GoogleSheetsService,
        private broadcastService: BroadcastService,
    ) {}

    /**
     * Initiate Google Sheets OAuth flow
     * GET /api/auth/google-sheets
     */
    @Get('auth/google-sheets')
    @UseGuards(JwtAuthGuard)
    async initiateOAuth(@Request() req, @Res() res: Response) {
        const authUrl = this.googleSheetsService.getAuthUrl(req.user.userId);
        this.logger.log(`Initiating Google Sheets OAuth for user ${req.user.userId}`);
        return res.redirect(authUrl);
    }

    /**
     * Handle Google OAuth callback
     * GET /api/auth/google-sheets/callback
     */
    @Get('auth/google-sheets/callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Query('error') error: string,
        @Res() res: Response,
    ) {
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

        if (error) {
            this.logger.error(`Google OAuth error: ${error}`);
            return res.redirect(
                `${frontendUrl}/oauth/callback?status=error&platform=google-sheets&error=${encodeURIComponent(error)}`,
            );
        }

        try {
            // Decode state to get userId
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            const userId = stateData.userId;

            if (!userId) {
                throw new Error('Missing userId in state');
            }

            await this.googleSheetsService.handleCallback(code, userId);

            this.logger.log(`Google Sheets connected successfully for user ${userId}`);
            return res.redirect(
                `${frontendUrl}/oauth/callback?status=success&platform=google-sheets`,
            );
        } catch (err) {
            this.logger.error('Google Sheets callback error', err);
            return res.redirect(
                `${frontendUrl}/oauth/callback?status=error&platform=google-sheets&error=${encodeURIComponent('Falha ao conectar Google Sheets')}`,
            );
        }
    }

    /**
     * Check connection status
     * GET /api/integrations/google-sheets/status
     */
    @Get('integrations/google-sheets/status')
    @UseGuards(JwtAuthGuard)
    async getStatus(@Request() req) {
        const integration = await this.googleSheetsService.findActiveByUser(req.user.userId);

        if (!integration) {
            return { connected: false, email: null, integrationId: null };
        }

        return {
            connected: true,
            email: integration.metadata?.email || null,
            integrationId: integration.id,
        };
    }

    /**
     * Disconnect Google Sheets
     * DELETE /api/integrations/google-sheets
     */
    @Delete('integrations/google-sheets')
    @UseGuards(JwtAuthGuard)
    async disconnect(@Request() req) {
        await this.googleSheetsService.disconnect(req.user.userId);
        return { success: true };
    }

    /**
     * List tabs from a spreadsheet
     * POST /api/broadcast/google-sheets/tabs
     */
    @Post('broadcast/google-sheets/tabs')
    @UseGuards(JwtAuthGuard)
    async listTabs(@Request() req, @Body() body: { spreadsheetUrl: string }) {
        if (!body.spreadsheetUrl) {
            return { error: 'URL da planilha e obrigatoria' };
        }

        const tabs = await this.googleSheetsService.listTabs(
            req.user.userId,
            body.spreadsheetUrl,
        );
        return { tabs };
    }

    /**
     * Import contacts from a Google Sheet
     * POST /api/broadcast/google-sheets/import
     */
    @Post('broadcast/google-sheets/import')
    @UseGuards(JwtAuthGuard)
    async importFromSheet(
        @Request() req,
        @Body() body: { spreadsheetUrl: string; sheetName: string },
    ) {
        if (!body.spreadsheetUrl || !body.sheetName) {
            return { error: 'URL e nome da aba sao obrigatorios' };
        }

        const csvString = await this.googleSheetsService.fetchSheetAsCSV(
            req.user.userId,
            body.spreadsheetUrl,
            body.sheetName,
        );

        const result = this.broadcastService.parseCSV(csvString);

        this.logger.log(
            `Imported from Google Sheets: ${result.validRows} valid contacts out of ${result.totalRows} rows`,
        );

        return {
            ...result,
            preview: result.contacts.slice(0, 10),
        };
    }
}
