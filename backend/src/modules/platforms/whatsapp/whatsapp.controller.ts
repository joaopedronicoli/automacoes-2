import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Request,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { SocialPlatform } from '../../../entities/social-account.entity';

interface SendTemplateDto {
    phoneNumberId: string;
    to: string;
    templateName: string;
    languageCode: string;
    components?: any[];
}

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
    private readonly logger = new Logger(WhatsAppController.name);

    constructor(
        private whatsappService: WhatsAppService,
        private socialAccountsService: SocialAccountsService,
    ) {}

    /**
     * Get user access token from any connected Facebook account
     */
    private async getUserAccessToken(userId: string): Promise<string> {
        const accounts = await this.socialAccountsService.findByUser(userId);
        const facebookAccount = accounts.find(acc => acc.platform === SocialPlatform.FACEBOOK);

        if (!facebookAccount) {
            throw new BadRequestException('No Facebook account connected. Please connect your Facebook account first.');
        }

        // Get decrypted metadata with user access token
        const fullAccount = await this.socialAccountsService.findById(facebookAccount.id);
        const metadata = await this.socialAccountsService.getDecryptedMetadata(fullAccount);

        if (!metadata?.userAccessToken) {
            throw new BadRequestException('WhatsApp access not configured. Please reconnect your Facebook account to grant WhatsApp permissions.');
        }

        return metadata.userAccessToken;
    }

    /**
     * List all WABAs for the user
     * GET /api/whatsapp/wabas
     */
    @Get('wabas')
    async listWABAs(@Request() req) {
        try {
            const accessToken = await this.getUserAccessToken(req.user.userId);
            const wabas = await this.whatsappService.getAllUserWABAs(accessToken);

            this.logger.log(`Found ${wabas.length} WABAs for user ${req.user.userId}`);
            return wabas;
        } catch (error) {
            this.logger.error('Failed to list WABAs', error);
            throw error;
        }
    }

    /**
     * List phone numbers for a WABA
     * GET /api/whatsapp/:wabaId/phone-numbers
     */
    @Get(':wabaId/phone-numbers')
    async listPhoneNumbers(@Request() req, @Param('wabaId') wabaId: string) {
        try {
            const accessToken = await this.getUserAccessToken(req.user.userId);
            const phoneNumbers = await this.whatsappService.getPhoneNumbers(wabaId, accessToken);

            this.logger.log(`Found ${phoneNumbers.length} phone numbers for WABA ${wabaId}`);
            return phoneNumbers;
        } catch (error) {
            this.logger.error(`Failed to list phone numbers for WABA ${wabaId}`, error);
            throw error;
        }
    }

    /**
     * List approved templates for a WABA
     * GET /api/whatsapp/:wabaId/templates
     */
    @Get(':wabaId/templates')
    async listTemplates(@Request() req, @Param('wabaId') wabaId: string) {
        try {
            const accessToken = await this.getUserAccessToken(req.user.userId);
            const templates = await this.whatsappService.getTemplates(wabaId, accessToken);

            this.logger.log(`Found ${templates.length} templates for WABA ${wabaId}`);
            return templates;
        } catch (error) {
            this.logger.error(`Failed to list templates for WABA ${wabaId}`, error);
            throw error;
        }
    }

    /**
     * Send a template message
     * POST /api/whatsapp/send-template
     */
    @Post('send-template')
    async sendTemplate(@Request() req, @Body() dto: SendTemplateDto) {
        try {
            if (!dto.phoneNumberId || !dto.to || !dto.templateName || !dto.languageCode) {
                throw new BadRequestException('Missing required fields: phoneNumberId, to, templateName, languageCode');
            }

            const accessToken = await this.getUserAccessToken(req.user.userId);

            const result = await this.whatsappService.sendTemplate({
                phoneNumberId: dto.phoneNumberId,
                to: dto.to,
                templateName: dto.templateName,
                languageCode: dto.languageCode,
                components: dto.components,
                accessToken,
            });

            this.logger.log(`Template ${dto.templateName} sent to ${dto.to}`);
            return result;
        } catch (error) {
            this.logger.error('Failed to send template', error);
            throw error;
        }
    }
}
