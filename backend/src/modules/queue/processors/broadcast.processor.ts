import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BroadcastService } from '../../broadcast/broadcast.service';
import { WhatsAppService } from '../../platforms/whatsapp/whatsapp.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { ChatwootService } from '../../chatwoot/chatwoot.service';
import { BroadcastStatus, BroadcastContact, Broadcast } from '../../../entities/broadcast.entity';
import { SocialPlatform } from '../../../entities/social-account.entity';
import { IntegrationType } from '../../../entities/integration.entity';
import { VariableMapping } from '../../broadcast/dto/broadcast.dto';

// Constants for retry and rate limiting
const MAX_RETRY_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;  // 1 second base delay between messages
const MAX_JITTER_MS = 500;   // Random jitter up to 500ms

@Processor('broadcast')
export class BroadcastProcessor {
    private readonly logger = new Logger(BroadcastProcessor.name);

    constructor(
        private broadcastService: BroadcastService,
        private whatsappService: WhatsAppService,
        private socialAccountsService: SocialAccountsService,
        private integrationsService: IntegrationsService,
        private chatwootService: ChatwootService,
    ) {}

    /**
     * Build template components from variable mappings
     */
    private buildTemplateComponents(
        mappings: VariableMapping[],
        contact: BroadcastContact,
        headerMediaType?: string,
        headerMediaUrl?: string,
    ): any[] {
        const components: any[] = [];

        // Handle media header (IMAGE, VIDEO, DOCUMENT)
        if (headerMediaType && headerMediaUrl) {
            const mediaType = headerMediaType.toLowerCase();
            const parameter: any = { type: mediaType };
            parameter[mediaType] = { link: headerMediaUrl };
            components.push({ type: 'header', parameters: [parameter] });
        }

        if (!mappings || mappings.length === 0) {
            return components;
        }

        // Group mappings by component type
        const headerMappings = mappings.filter(m => m.componentType === 'HEADER');
        const bodyMappings = mappings.filter(m => m.componentType === 'BODY');
        const buttonMappings = mappings.filter(m => m.componentType === 'BUTTON');

        // HEADER components (text variables - only if no media header)
        if (headerMappings.length > 0 && !headerMediaType) {
            const parameters = headerMappings
                .sort((a, b) => a.variableIndex - b.variableIndex)
                .map(mapping => ({
                    type: 'text',
                    text: mapping.source === 'manual'
                        ? mapping.manualValue || ''
                        : contact[mapping.csvColumn!] || ''
                }));
            components.push({ type: 'header', parameters });
        }

        // BODY components
        if (bodyMappings.length > 0) {
            const parameters = bodyMappings
                .sort((a, b) => a.variableIndex - b.variableIndex)
                .map(mapping => {
                    let text = '';
                    if (mapping.source === 'manual') {
                        text = mapping.manualValue || '';
                    } else {
                        // Try exact match first, then case-insensitive match
                        const csvColumn = mapping.csvColumn || '';
                        text = contact[csvColumn];

                        // If not found, try case-insensitive lookup
                        if (text === undefined || text === null) {
                            const contactKeys = Object.keys(contact);
                            const matchingKey = contactKeys.find(
                                key => key.toLowerCase().trim() === csvColumn.toLowerCase().trim()
                            );
                            if (matchingKey) {
                                text = contact[matchingKey];
                                this.logger.log(`Found column "${matchingKey}" for mapping "${csvColumn}"`);
                            }
                        }

                        text = text || '';
                    }

                    // Meta API doesn't accept empty strings - use a space as fallback
                    if (!text || text.trim() === '') {
                        this.logger.warn(`Empty value for variable ${mapping.variableIndex} (column: ${mapping.csvColumn})`);
                        text = ' ';
                    }
                    return { type: 'text', text };
                });
            components.push({ type: 'body', parameters });
        }

        // BUTTON components (for dynamic URLs)
        if (buttonMappings.length > 0) {
            const parameters = buttonMappings
                .sort((a, b) => a.variableIndex - b.variableIndex)
                .map(mapping => ({
                    type: 'text',
                    text: mapping.source === 'manual'
                        ? mapping.manualValue || ''
                        : contact[mapping.csvColumn!] || ''
                }));
            components.push({
                type: 'button',
                sub_type: 'url',
                index: 0,
                parameters
            });
        }

        return components;
    }

    /**
     * Build message content for Chatwoot based on template
     * Shows the actual content that was sent
     */
    private buildMessageContent(
        broadcast: any,
        mappings: VariableMapping[],
        contact: BroadcastContact,
    ): string {
        // Build the actual message content with variables replaced
        const bodyMappings = mappings?.filter(m => m.componentType === 'BODY') || [];
        const headerMappings = mappings?.filter(m => m.componentType === 'HEADER') || [];

        let content = `📤 *BROADCAST ENVIADO*\n`;
        content += `━━━━━━━━━━━━━━━━━━━━━\n`;
        content += `📋 Campanha: ${broadcast.name}\n`;
        content += `📝 Template: ${broadcast.templateName}\n`;
        content += `👤 Para: ${contact.name}\n`;
        content += `📱 Telefone: ${contact.phone}\n`;
        content += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Show header content if exists
        if (broadcast.headerMediaUrl) {
            content += `🖼️ *Mídia:* ${broadcast.headerMediaUrl}\n\n`;
        } else if (headerMappings.length > 0) {
            content += `📌 *Cabeçalho:*\n`;
            for (const mapping of headerMappings) {
                const value = this.getVariableValue(mapping, contact);
                content += `${value}\n`;
            }
            content += `\n`;
        }

        // Show body content with actual values
        if (bodyMappings.length > 0) {
            content += `💬 *Mensagem:*\n`;
            for (const mapping of bodyMappings) {
                const value = this.getVariableValue(mapping, contact);
                content += `{{${mapping.variableIndex}}} = ${value}\n`;
            }
        }

        content += `\n⏰ Enviado em: ${new Date().toLocaleString('pt-BR')}`;

        return content;
    }

    /**
     * Get variable value from mapping
     */
    private getVariableValue(mapping: VariableMapping, contact: BroadcastContact): string {
        if (mapping.source === 'manual') {
            return mapping.manualValue || '';
        }

        // Try exact match first, then case-insensitive
        const csvColumn = mapping.csvColumn || '';
        let value = contact[csvColumn];

        if (value === undefined || value === null) {
            const contactKeys = Object.keys(contact);
            const matchingKey = contactKeys.find(
                key => key.toLowerCase().trim() === csvColumn.toLowerCase().trim()
            );
            if (matchingKey) {
                value = contact[matchingKey];
            }
        }

        return value || '';
    }

    /**
     * Register message in Chatwoot if integration is active
     */
    private async registerInChatwoot(
        userId: string,
        contact: BroadcastContact,
        messageContent: string,
        conversationTags?: string[],
        contactTags?: string[],
    ): Promise<void> {
        try {
            // Check if user has active Chatwoot integration
            const chatwootIntegration = await this.integrationsService.findActiveChatwoot(userId);

            if (!chatwootIntegration) {
                return; // No Chatwoot integration, skip
            }

            const chatwootUrl = chatwootIntegration.storeUrl;
            const accessToken = chatwootIntegration.consumerKey;
            const metadata = chatwootIntegration.metadata || {};
            const accountId = metadata.accountId;
            const inboxId = metadata.inboxId;

            if (!accountId || !inboxId) {
                this.logger.warn('Chatwoot integration missing accountId or inboxId');
                return;
            }

            // Register the broadcast message (with tags)
            await this.chatwootService.registerBroadcastMessage(
                chatwootUrl,
                accessToken,
                accountId,
                inboxId,
                {
                    name: contact.name,
                    phone_number: contact.phone,
                    email: (contact as any).email,
                },
                messageContent,
                conversationTags,
                contactTags,
            );

            this.logger.log(`Registered message in Chatwoot for ${contact.phone}`);
        } catch (error) {
            this.logger.error(`Failed to register message in Chatwoot: ${error.message}`);
            // Don't throw - we don't want to fail the broadcast if Chatwoot fails
        }
    }

    @Process('send-broadcast')
    async handleBroadcast(job: Job<{ broadcastId: string; userId: string; retryMode?: boolean }>) {
        const { broadcastId, userId, retryMode } = job.data;

        this.logger.log(`Processing broadcast ${broadcastId}${retryMode ? ' (retry mode)' : ''}`);

        try {
            const broadcast = await this.broadcastService.findById(broadcastId);

            if (!broadcast) {
                this.logger.error(`Broadcast ${broadcastId} not found`);
                return;
            }

            if (broadcast.status === BroadcastStatus.CANCELLED) {
                this.logger.log(`Broadcast ${broadcastId} was cancelled, skipping`);
                return;
            }

            // Check time window
            if (!this.broadcastService.isWithinTimeWindow(broadcast)) {
                this.logger.log(`Broadcast ${broadcastId} outside time window, pausing`);
                await this.broadcastService.pauseBroadcast(broadcastId);
                return;
            }

            // Get user access token
            const accounts = await this.socialAccountsService.findByUser(userId);
            const facebookAccount = accounts.find(acc => acc.platform === SocialPlatform.FACEBOOK);

            if (!facebookAccount) {
                await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.FAILED, {
                    errorMessage: 'No Facebook account connected',
                    completedAt: new Date(),
                });
                return;
            }

            const fullAccount = await this.socialAccountsService.findById(facebookAccount.id);
            const metadata = await this.socialAccountsService.getDecryptedMetadata(fullAccount);

            if (!metadata?.userAccessToken) {
                await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.FAILED, {
                    errorMessage: 'WhatsApp access not configured',
                    completedAt: new Date(),
                });
                return;
            }

            const accessToken = metadata.userAccessToken;

            // Process each contact starting from currentIndex (for resume)
            let sentCount = broadcast.sentCount || 0;
            let failedCount = broadcast.failedCount || 0;
            let skippedCount = broadcast.contacts.filter(c => c.status === 'skipped').length;
            const updatedContacts = [...broadcast.contacts];
            const startIndex = broadcast.currentIndex || 0;

            this.logger.log(`Starting from index ${startIndex}, total contacts: ${updatedContacts.length}`);

            for (let i = startIndex; i < updatedContacts.length; i++) {
                const contact = updatedContacts[i];

                // Skip if already processed (for retry mode, only process pending)
                if (contact.status === 'sent' || contact.status === 'skipped') {
                    continue;
                }

                // Check if broadcast was cancelled or paused
                const currentBroadcast = await this.broadcastService.findById(broadcastId);
                if (currentBroadcast?.status === BroadcastStatus.CANCELLED) {
                    this.logger.log(`Broadcast ${broadcastId} was cancelled, stopping at contact ${i + 1}/${updatedContacts.length}`);
                    break;
                }

                if (currentBroadcast?.status === BroadcastStatus.PAUSED) {
                    this.logger.log(`Broadcast ${broadcastId} was paused, stopping at contact ${i + 1}/${updatedContacts.length}`);
                    await this.broadcastService.updateCurrentIndex(broadcastId, i);
                    return;
                }

                // Check time window again (may have changed during processing)
                if (!this.broadcastService.isWithinTimeWindow(broadcast)) {
                    this.logger.log(`Broadcast ${broadcastId} now outside time window, pausing at index ${i}`);
                    await this.broadcastService.updateCurrentIndex(broadcastId, i);
                    await this.broadcastService.pauseBroadcast(broadcastId);
                    await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.PAUSED, {
                        sentCount,
                        failedCount,
                        contacts: updatedContacts,
                    });
                    return;
                }

                // Check deduplication if enabled
                if (broadcast.enableDeduplication) {
                    const isDuplicate = await this.broadcastService.isContactDuplicate(
                        userId,
                        broadcast.name,
                        contact.phone,
                    );

                    if (isDuplicate) {
                        updatedContacts[i] = {
                            ...contact,
                            status: 'skipped',
                            error: 'Duplicate - already received this broadcast',
                        };
                        skippedCount++;
                        this.logger.log(`Skipped duplicate contact ${contact.phone}`);
                        continue;
                    }
                }

                try {
                    // Build components dynamically from mappings if available
                    const components = this.buildTemplateComponents(
                        broadcast.templateComponents as VariableMapping[] || [],
                        contact,
                        broadcast.headerMediaType,
                        broadcast.headerMediaUrl,
                    );

                    // Log components for debugging
                    this.logger.log(`Sending template ${broadcast.templateName} to ${contact.phone} with components: ${JSON.stringify(components)}`);

                    // Send with retry logic
                    const result = await this.sendWithRetry(
                        broadcast,
                        contact,
                        accessToken,
                        components,
                    );

                    updatedContacts[i] = {
                        ...contact,
                        status: 'sent',
                        messageId: result.messages?.[0]?.id,
                        sentAt: new Date(),
                    };
                    sentCount++;

                    this.logger.log(`Sent template to ${contact.phone} (${i + 1}/${updatedContacts.length})`);

                    // Record in history for deduplication
                    if (broadcast.enableDeduplication) {
                        await this.broadcastService.recordSentContact(
                            userId,
                            broadcast.name,
                            contact.phone,
                        );
                    }

                    // Register message in Chatwoot (with tags)
                    const templateBody = broadcast.templateComponents && Array.isArray(broadcast.templateComponents)
                        ? this.buildMessageContent(broadcast, broadcast.templateComponents as VariableMapping[], contact)
                        : `Template: ${broadcast.templateName}`;

                    await this.registerInChatwoot(
                        userId,
                        contact,
                        templateBody,
                        broadcast.conversationTags,
                        broadcast.contactTags,
                    );

                } catch (error) {
                    updatedContacts[i] = {
                        ...contact,
                        status: 'failed',
                        error: error.message || 'Failed to send message',
                        sentAt: new Date(),
                        retryAttempts: (contact.retryAttempts || 0) + 1,
                    };
                    failedCount++;

                    this.logger.error(`Failed to send to ${contact.phone}: ${error.message}`);
                }

                // Update progress periodically (every 10 contacts or at the end)
                if ((i + 1) % 10 === 0 || i === updatedContacts.length - 1) {
                    await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.PROCESSING, {
                        sentCount,
                        failedCount,
                        contacts: updatedContacts,
                    });
                    await this.broadcastService.updateCurrentIndex(broadcastId, i + 1);
                }

                // Configurable delay between messages with jitter
                if (i < updatedContacts.length - 1) {
                    await this.delay(this.calculateDelay());
                }
            }

            // Mark as completed
            await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.COMPLETED, {
                sentCount,
                failedCount,
                contacts: updatedContacts,
                completedAt: new Date(),
            });

            this.logger.log(`Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed, ${skippedCount} skipped`);

        } catch (error) {
            this.logger.error(`Broadcast ${broadcastId} failed`, error);

            await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.FAILED, {
                errorMessage: error.message || 'Unknown error',
                completedAt: new Date(),
            });
        }
    }

    /**
     * Send message with exponential backoff retry
     */
    private async sendWithRetry(
        broadcast: Broadcast,
        contact: BroadcastContact,
        accessToken: string,
        components: any[],
        maxRetries: number = MAX_RETRY_ATTEMPTS,
    ): Promise<any> {
        let lastError: Error;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await this.whatsappService.sendTemplate({
                    phoneNumberId: broadcast.phoneNumberId,
                    to: contact.phone,
                    templateName: broadcast.templateName,
                    languageCode: broadcast.templateLanguage,
                    components,
                    accessToken,
                    category: broadcast.templateCategory,
                });
            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    // Exponential backoff: 1s, 2s, 4s
                    const backoffDelay = Math.pow(2, attempt) * 1000;
                    this.logger.warn(
                        `Retry ${attempt + 1}/${maxRetries} for ${contact.phone} after ${backoffDelay}ms`,
                    );
                    await this.delay(backoffDelay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Calculate delay between messages with random jitter
     */
    private calculateDelay(): number {
        const jitter = Math.random() * MAX_JITTER_MS;
        return BASE_DELAY_MS + jitter;
    }

    @Process('send-single-template')
    async handleSingleTemplate(job: Job<{
        userId: string;
        phoneNumberId: string;
        to: string;
        templateName: string;
        languageCode: string;
        components?: any[];
    }>) {
        const { userId, phoneNumberId, to, templateName, languageCode, components } = job.data;

        this.logger.log(`Sending single template ${templateName} to ${to}`);

        try {
            // Get user access token
            const accounts = await this.socialAccountsService.findByUser(userId);
            const facebookAccount = accounts.find(acc => acc.platform === SocialPlatform.FACEBOOK);

            if (!facebookAccount) {
                throw new Error('No Facebook account connected');
            }

            const fullAccount = await this.socialAccountsService.findById(facebookAccount.id);
            const metadata = await this.socialAccountsService.getDecryptedMetadata(fullAccount);

            if (!metadata?.userAccessToken) {
                throw new Error('WhatsApp access not configured');
            }

            await this.whatsappService.sendTemplate({
                phoneNumberId,
                to,
                templateName,
                languageCode,
                components,
                accessToken: metadata.userAccessToken,
            });

            this.logger.log(`Single template ${templateName} sent to ${to}`);

        } catch (error) {
            this.logger.error(`Failed to send single template to ${to}`, error);
            throw error;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
