import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { BroadcastService } from '../../broadcast/broadcast.service';
import { WhatsAppService } from '../../platforms/whatsapp/whatsapp.service';
import { SocialAccountsService } from '../../social-accounts/social-accounts.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { ChatwootService } from '../../chatwoot/chatwoot.service';
import { BroadcastStatus, BroadcastContact } from '../../../entities/broadcast.entity';
import { SocialPlatform } from '../../../entities/social-account.entity';
import { IntegrationType } from '../../../entities/integration.entity';
import { VariableMapping } from '../../broadcast/dto/broadcast.dto';

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
    ): any[] {
        if (!mappings || mappings.length === 0) {
            return [];
        }

        const components: any[] = [];

        // Group mappings by component type
        const headerMappings = mappings.filter(m => m.componentType === 'HEADER');
        const bodyMappings = mappings.filter(m => m.componentType === 'BODY');
        const buttonMappings = mappings.filter(m => m.componentType === 'BUTTON');

        // HEADER components
        if (headerMappings.length > 0) {
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
                .map(mapping => ({
                    type: 'text',
                    text: mapping.source === 'manual'
                        ? mapping.manualValue || ''
                        : contact[mapping.csvColumn!] || ''
                }));
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
     */
    private buildMessageContent(
        broadcast: any,
        mappings: VariableMapping[],
        contact: BroadcastContact,
    ): string {
        let content = `📱 *Broadcast: ${broadcast.name}*\n\n`;
        content += `Template: ${broadcast.templateName}\n`;
        content += `Destinatário: ${contact.name} (${contact.phone})\n\n`;

        // Add variable values if present
        if (mappings && mappings.length > 0) {
            content += `*Variáveis enviadas:*\n`;
            for (const mapping of mappings) {
                const value = mapping.source === 'manual'
                    ? mapping.manualValue
                    : contact[mapping.csvColumn!] || '';
                content += `- {{${mapping.variableIndex}}} (${mapping.componentType}): ${value}\n`;
            }
        }

        return content;
    }

    /**
     * Register message in Chatwoot if integration is active
     */
    private async registerInChatwoot(
        userId: string,
        contact: BroadcastContact,
        messageContent: string,
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

            // Register the broadcast message
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
            );

            this.logger.log(`Registered message in Chatwoot for ${contact.phone}`);
        } catch (error) {
            this.logger.error(`Failed to register message in Chatwoot: ${error.message}`);
            // Don't throw - we don't want to fail the broadcast if Chatwoot fails
        }
    }

    @Process('send-broadcast')
    async handleBroadcast(job: Job<{ broadcastId: string; userId: string }>) {
        const { broadcastId, userId } = job.data;

        this.logger.log(`Processing broadcast ${broadcastId}`);

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

            // Process each contact
            let sentCount = 0;
            let failedCount = 0;
            const updatedContacts = [...broadcast.contacts];

            for (let i = 0; i < updatedContacts.length; i++) {
                const contact = updatedContacts[i];

                // Check if broadcast was cancelled
                const currentBroadcast = await this.broadcastService.findById(broadcastId);
                if (currentBroadcast?.status === BroadcastStatus.CANCELLED) {
                    this.logger.log(`Broadcast ${broadcastId} was cancelled, stopping at contact ${i + 1}/${updatedContacts.length}`);
                    break;
                }

                try {
                    // Build components dynamically from mappings if available
                    const components = broadcast.templateComponents && Array.isArray(broadcast.templateComponents) && broadcast.templateComponents.length > 0
                        ? this.buildTemplateComponents(broadcast.templateComponents as VariableMapping[], contact)
                        : [];

                    const result = await this.whatsappService.sendTemplate({
                        phoneNumberId: broadcast.phoneNumberId,
                        to: contact.phone,
                        templateName: broadcast.templateName,
                        languageCode: broadcast.templateLanguage,
                        components,
                        accessToken,
                    });

                    updatedContacts[i] = {
                        ...contact,
                        status: 'sent',
                        messageId: result.messages?.[0]?.id,
                        sentAt: new Date(),
                    };
                    sentCount++;

                    this.logger.log(`Sent template to ${contact.phone} (${i + 1}/${updatedContacts.length})`);

                    // Register message in Chatwoot
                    const templateBody = broadcast.templateComponents && Array.isArray(broadcast.templateComponents)
                        ? this.buildMessageContent(broadcast, broadcast.templateComponents as VariableMapping[], contact)
                        : `Template: ${broadcast.templateName}`;

                    await this.registerInChatwoot(userId, contact, templateBody);

                } catch (error) {
                    updatedContacts[i] = {
                        ...contact,
                        status: 'failed',
                        error: error.message || 'Failed to send message',
                        sentAt: new Date(),
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
                }

                // Small delay between messages to respect rate limits
                if (i < updatedContacts.length - 1) {
                    await this.delay(100); // 100ms between messages
                }
            }

            // Mark as completed
            await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.COMPLETED, {
                sentCount,
                failedCount,
                contacts: updatedContacts,
                completedAt: new Date(),
            });

            this.logger.log(`Broadcast ${broadcastId} completed: ${sentCount} sent, ${failedCount} failed`);

        } catch (error) {
            this.logger.error(`Broadcast ${broadcastId} failed`, error);

            await this.broadcastService.updateStatus(broadcastId, BroadcastStatus.FAILED, {
                errorMessage: error.message || 'Unknown error',
                completedAt: new Date(),
            });
        }
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
