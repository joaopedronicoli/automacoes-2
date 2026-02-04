import {
    Controller,
    Post,
    Body,
    Headers,
    Logger,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InstagramChatwootService } from './instagram-chatwoot.service';

@Controller('webhooks/chatwoot')
export class InstagramChatwootWebhookController {
    private readonly logger = new Logger(InstagramChatwootWebhookController.name);

    constructor(
        private instagramChatwootService: InstagramChatwootService,
        private configService: ConfigService,
    ) {}

    /**
     * Receives webhook events from Chatwoot
     * Configure in Chatwoot: Settings > Integrations > Webhooks
     * URL: https://your-app/api/webhooks/chatwoot
     * Events: message_created
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleChatwootWebhook(
        @Body() payload: any,
        @Headers('x-chatwoot-signature') signature: string,
    ) {
        this.logger.log(`Received Chatwoot webhook: ${payload.event}`);

        // Optional: Verify signature if CHATWOOT_WEBHOOK_SECRET is configured
        const webhookSecret = this.configService.get('CHATWOOT_WEBHOOK_SECRET');
        if (webhookSecret && signature) {
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSignature) {
                this.logger.warn('Invalid Chatwoot webhook signature');
                return { status: 'invalid_signature' };
            }
        }

        // Process asynchronously to respond quickly
        this.instagramChatwootService
            .handleOutgoingChatwootMessage(payload)
            .catch((error) => {
                this.logger.error('Error processing Chatwoot webhook', error);
            });

        return { status: 'ok' };
    }
}
