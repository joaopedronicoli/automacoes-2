import {
    Controller,
    Get,
    Post,
    Query,
    Body,
    Headers,
    Logger,
    BadRequestException,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { FacebookService } from './facebook.service';

interface WebhookEntry {
    id: string;
    time: number;
    changes?: Array<{
        field: string;
        value: any;
    }>;
    messaging?: Array<any>;
}

interface WebhookPayload {
    object: string;
    entry: WebhookEntry[];
}

@Controller('webhooks/facebook')
export class FacebookWebhooksController {
    private readonly logger = new Logger(FacebookWebhooksController.name);

    constructor(
        private configService: ConfigService,
        private facebookService: FacebookService,
        @InjectQueue('automations') private automationsQueue: Queue,
    ) { }

    /**
     * Webhook verification (GET request from Facebook)
     * Facebook will call this to verify the webhook endpoint
     */
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.challenge') challenge: string,
        @Query('hub.verify_token') verifyToken: string,
    ) {
        const expectedToken = this.configService.get('FACEBOOK_APP_SECRET');

        // Check if mode and token are valid
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            this.logger.log('Webhook verified successfully');
            // Return challenge to complete verification
            return challenge;
        }

        this.logger.warn('Webhook verification failed - invalid token');
        throw new BadRequestException('Verification failed');
    }

    /**
     * Webhook event handler (POST request from Facebook)
     * Receives real-time updates about page events
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Headers('x-hub-signature-256') signature: string,
        @Headers('x-forwarded-from') forwardedFrom: string,
        @Body() payload: WebhookPayload,
    ) {
        this.logger.log(`Received webhook event - object: ${payload?.object}, entries: ${payload?.entry?.length || 0}, isArray: ${Array.isArray(payload)}`);
        this.logger.debug(`Webhook payload: ${JSON.stringify(payload).substring(0, 500)}`);

        // Allow requests forwarded from n8n (skip signature verification)
        const isFromN8n = forwardedFrom === 'n8n';

        if (!isFromN8n) {
            // Verify webhook signature for security (direct Meta requests)
            if (!signature) {
                this.logger.warn('Missing webhook signature');
                throw new BadRequestException('Missing signature');
            }

            const isValid = this.facebookService.verifyWebhookSignature(signature, JSON.stringify(payload));

            if (!isValid) {
                this.logger.error('Invalid webhook signature');
                throw new BadRequestException('Invalid signature');
            }
        } else {
            this.logger.log('Webhook forwarded from n8n, skipping signature verification');
        }

        // Normalize payload - handle various n8n forwarding formats
        let normalizedPayload: WebhookPayload = payload;

        // Handle case where n8n wraps payload in an array
        if (Array.isArray(normalizedPayload)) {
            this.logger.warn('Payload received as array, extracting first element');
            normalizedPayload = (normalizedPayload as any)[0] as WebhookPayload;
        }

        // Handle case where payload is nested inside a body property (n8n wrapper)
        if ((normalizedPayload as any)?.body && !(normalizedPayload as any).object) {
            this.logger.warn('Payload wrapped in body property, extracting');
            normalizedPayload = (normalizedPayload as any).body as WebhookPayload;
        }

        if (!normalizedPayload?.object) {
            this.logger.warn(`Invalid payload - no object field. Keys: ${Object.keys(normalizedPayload || {}).join(', ')}`);
            return { status: 'ok' };
        }

        // Process each entry in the webhook
        if (normalizedPayload.object === 'page') {
            for (const entry of normalizedPayload.entry) {
                await this.processPageEntry(entry);
            }
        } else if (normalizedPayload.object === 'instagram') {
            for (const entry of normalizedPayload.entry) {
                await this.processInstagramEntry(entry);
            }
        } else {
            this.logger.warn(`Unknown webhook object type: ${normalizedPayload.object}`);
        }

        // Always return 200 OK to acknowledge receipt
        return { status: 'ok' };
    }

    /**
     * Process Facebook Page webhook entry
     */
    private async processPageEntry(entry: WebhookEntry) {
        const pageId = entry.id;

        // Process changes (feed, comments, etc.)
        if (entry.changes) {
            for (const change of entry.changes) {
                try {
                    await this.processPageChange(pageId, change);
                } catch (error) {
                    this.logger.error(`Failed to process page change`, error);
                }
            }
        }

        // Process messaging events
        if (entry.messaging) {
            for (const message of entry.messaging) {
                try {
                    await this.processMessagingEvent(pageId, message);
                } catch (error) {
                    this.logger.error(`Failed to process messaging event`, error);
                }
            }
        }
    }

    /**
     * Process Facebook Page change event
     */
    private async processPageChange(pageId: string, change: any) {
        const { field, value } = change;

        this.logger.log(`Processing change: ${field} for page ${pageId}`);

        switch (field) {
            case 'feed':
                // New post created
                await this.handleFeedUpdate(pageId, value);
                break;

            case 'comments':
                // New comment on post
                await this.handleCommentEvent(pageId, value);
                break;

            case 'mention':
                // Page was mentioned
                await this.handleMentionEvent(pageId, value);
                break;

            default:
                this.logger.debug(`Unhandled field type: ${field}`);
        }
    }

    /**
     * Handle new comment on Facebook post
     */
    private async handleCommentEvent(pageId: string, value: any) {
        const {
            post_id,
            comment_id,
            from,
            message,
            created_time,
            parent_id,
        } = value;

        // Skip if it's a reply to another comment (we only process top-level comments for now)
        if (parent_id) {
            this.logger.debug(`Skipping reply comment ${comment_id}`);
            return;
        }

        this.logger.log(`New comment ${comment_id} on post ${post_id} from ${from.name}`);

        // Add to automation queue for processing
        await this.automationsQueue.add('process-comment', {
            platform: 'facebook',
            pageId,
            postId: post_id,
            commentId: comment_id,
            userId: from.id,
            userName: from.name,
            message,
            createdTime: created_time,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });

        this.logger.log(`Queued comment ${comment_id} for automation processing`);
    }

    /**
     * Handle feed update (new post)
     */
    private async handleFeedUpdate(pageId: string, value: any) {
        const { post_id, item, verb } = value;

        if (verb === 'add') {
            this.logger.log(`New post ${post_id} on page ${pageId}`);

            // Queue for syncing
            await this.automationsQueue.add('sync-post', {
                platform: 'facebook',
                pageId,
                postId: post_id,
            });
        }
    }

    /**
     * Handle page mention
     */
    private async handleMentionEvent(pageId: string, value: any) {
        this.logger.log(`Page ${pageId} was mentioned`);

        // Can queue for notification or automation
        await this.automationsQueue.add('process-mention', {
            platform: 'facebook',
            pageId,
            ...value,
        });
    }

    /**
     * Process messaging event (private messages)
     */
    private async processMessagingEvent(pageId: string, messaging: any) {
        const { sender, recipient, timestamp, message } = messaging;

        if (message) {
            // Skip echo messages (messages sent by us that are echoed back)
            if (message.is_echo) {
                this.logger.log(`Skipping echo message from ${sender.id}`);
                return;
            }

            this.logger.log(`New message from ${sender.id} to page ${pageId}`);

            // Queue for automation (if configured)
            await this.automationsQueue.add('process-message', {
                platform: 'facebook',
                pageId,
                senderId: sender.id,
                recipientId: recipient.id,
                message: message.text,
                timestamp,
            });
        }
    }

    // ========================================
    // INSTAGRAM WEBHOOKS
    // ========================================

    /**
     * Process Instagram webhook entry
     */
    private async processInstagramEntry(entry: WebhookEntry) {
        const instagramAccountId = entry.id;

        this.logger.log(`Processing Instagram entry for account ${instagramAccountId} - changes: ${entry.changes?.length || 0}, messaging: ${entry.messaging?.length || 0}`);

        if (entry.changes) {
            for (const change of entry.changes) {
                try {
                    await this.processInstagramChange(instagramAccountId, change);
                } catch (error) {
                    this.logger.error(`Failed to process Instagram change`, error);
                }
            }
        }

        if (entry.messaging) {
            for (const message of entry.messaging) {
                try {
                    await this.processInstagramMessage(instagramAccountId, message);
                } catch (error) {
                    this.logger.error(`Failed to process Instagram message`, error);
                }
            }
        }
    }

    /**
     * Process Instagram change event
     */
    private async processInstagramChange(instagramAccountId: string, change: any) {
        const { field, value } = change;

        this.logger.log(`Processing Instagram change: ${field} for account ${instagramAccountId}`);

        switch (field) {
            case 'comments':
                await this.handleInstagramComment(instagramAccountId, value);
                break;

            case 'mentions':
                await this.handleInstagramMention(instagramAccountId, value);
                break;

            default:
                this.logger.debug(`Unhandled Instagram field: ${field}`);
        }
    }

    /**
     * Handle new Instagram comment
     */
    private async handleInstagramComment(instagramAccountId: string, value: any) {
        const { media, id: commentId, from, text, parent_id } = value;
        const mediaId = media?.id;

        // Skip replies (only process top-level comments)
        if (parent_id) {
            this.logger.debug(`Skipping Instagram reply comment ${commentId}`);
            return;
        }

        this.logger.log(`New Instagram comment ${commentId} on media ${mediaId}`);

        // Skip if no from field (user privacy settings or deleted user)
        if (!from || !from.id) {
            this.logger.warn(`Instagram comment ${commentId} has no 'from' field, skipping`);
            return;
        }

        // Queue for automation processing
        await this.automationsQueue.add('process-comment', {
            platform: 'instagram',
            instagramAccountId,
            mediaId,
            commentId,
            userId: from.id,
            userName: from.username,
            message: text,
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
        });

        this.logger.log(`Queued Instagram comment ${commentId} for processing`);
    }

    /**
     * Handle Instagram mention
     */
    private async handleInstagramMention(instagramAccountId: string, value: any) {
        this.logger.log(`Instagram account ${instagramAccountId} was mentioned`);

        await this.automationsQueue.add('process-mention', {
            platform: 'instagram',
            instagramAccountId,
            ...value,
        });
    }

    /**
     * Process Instagram direct message
     */
    private async processInstagramMessage(instagramAccountId: string, messaging: any) {
        const { sender, recipient, timestamp, message } = messaging;

        if (message) {
            // Skip echo messages (messages sent by us that are echoed back)
            if (message.is_echo) {
                this.logger.log(`Skipping echo message from ${sender.id}`);
                return;
            }

            this.logger.log(`New Instagram message from ${sender.id}`);

            await this.automationsQueue.add('process-message', {
                platform: 'instagram',
                instagramAccountId,
                senderId: sender.id,
                recipientId: recipient.id,
                message: message.text,
                messageId: message.mid,
                timestamp,
            });
        }
    }

    /**
     * Test webhook endpoint (development only)
     */
    @Post('test')
    async testWebhook(@Body() body: any) {
        if (this.configService.get('NODE_ENV') !== 'development') {
            throw new BadRequestException('Test endpoint only available in development');
        }

        this.logger.log('Test webhook called');
        await this.handleWebhook('test-signature', 'n8n', body);

        return { status: 'ok', message: 'Test webhook processed' };
    }
}
