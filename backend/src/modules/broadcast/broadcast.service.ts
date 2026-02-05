import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, In } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Broadcast, BroadcastStatus } from '../../entities/broadcast.entity';
import { BroadcastHistory } from '../../entities/broadcast-history.entity';
import {
    CreateBroadcastDto,
    ParsedCSVResult,
    BroadcastContact,
    TemplatePreviewDto,
    PreviewResult,
    ChatwootSyncResult,
    DuplicateCheckResult,
    AnalyticsFilters,
    AnalyticsResult,
    VariableMapping,
    CheckChatwootContactsDto,
} from './dto/broadcast.dto';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { IntegrationsService } from '../integrations/integrations.service';

@Injectable()
export class BroadcastService {
    private readonly logger = new Logger(BroadcastService.name);

    constructor(
        @InjectRepository(Broadcast)
        private broadcastRepository: Repository<Broadcast>,
        @InjectRepository(BroadcastHistory)
        private broadcastHistoryRepository: Repository<BroadcastHistory>,
        @InjectQueue('broadcast')
        private broadcastQueue: Queue,
        private chatwootService: ChatwootService,
        private integrationsService: IntegrationsService,
    ) {}

    /**
     * Parse CSV content and extract contacts with dynamic columns
     */
    parseCSV(csvContent: string): ParsedCSVResult {
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        const contacts: BroadcastContact[] = [];
        const errors: string[] = [];

        if (lines.length === 0) {
            return {
                contacts: [],
                errors: ['CSV file is empty'],
                totalRows: 0,
                validRows: 0,
                detectedColumns: [],
                columnMapping: {},
            };
        }

        // Try to detect delimiter
        const delimiter = lines[0].includes(';') ? ';' : ',';

        // Try to detect header row
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('name') || firstLine.includes('nome') ||
                          firstLine.includes('phone') || firstLine.includes('telefone');

        // Parse header to get column names
        let headers: string[] = [];
        let columnMapping: { [key: string]: number } = {};
        let startIndex = 0;

        if (hasHeader) {
            headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
            headers.forEach((header, index) => {
                columnMapping[header] = index;
            });
            startIndex = 1;
        } else {
            // Generate default column names if no header
            const firstLineParts = lines[0].split(delimiter);
            headers = firstLineParts.map((_, index) =>
                index === 0 ? 'name' : index === 1 ? 'phone' : `var${index - 1}`
            );
            headers.forEach((header, index) => {
                columnMapping[header] = index;
            });
        }

        const totalRows = lines.length - startIndex;

        // Find name and phone column indices
        const nameIndex = headers.findIndex(h =>
            h.toLowerCase() === 'name' || h.toLowerCase() === 'nome'
        );
        const phoneIndex = headers.findIndex(h =>
            h.toLowerCase() === 'phone' || h.toLowerCase() === 'telefone' || h.toLowerCase() === 'fone'
        );

        if (nameIndex === -1 || phoneIndex === -1) {
            return {
                contacts: [],
                errors: ['CSV must have "name" and "phone" columns'],
                totalRows,
                validRows: 0,
                detectedColumns: headers,
                columnMapping,
            };
        }

        // Parse data rows
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(delimiter).map(part => part.trim().replace(/^["']|["']$/g, ''));

            if (parts.length < 2) {
                errors.push(`Line ${i + 1}: Invalid format - expected at least 2 columns`);
                continue;
            }

            const name = parts[nameIndex];
            const phone = parts[phoneIndex];

            if (!name) {
                errors.push(`Line ${i + 1}: Name is required`);
                continue;
            }

            if (!phone) {
                errors.push(`Line ${i + 1}: Phone is required`);
                continue;
            }

            // Basic phone validation - remove non-digits and check length
            const cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length < 10 || cleanPhone.length > 15) {
                errors.push(`Line ${i + 1}: Invalid phone number "${phone}"`);
                continue;
            }

            // Build contact object with all columns
            const contact: BroadcastContact = {
                name,
                phone: cleanPhone,
                status: 'pending',
            };

            // Add all other columns as dynamic fields
            headers.forEach((header, index) => {
                if (index !== nameIndex && index !== phoneIndex && parts[index]) {
                    contact[header] = parts[index];
                }
            });

            contacts.push(contact);
        }

        return {
            contacts,
            errors,
            totalRows,
            validRows: contacts.length,
            detectedColumns: headers,
            columnMapping,
        };
    }

    /**
     * Create a new broadcast
     */
    async create(userId: string, dto: CreateBroadcastDto): Promise<Broadcast> {
        let contacts: BroadcastContact[];

        // Handle different modes
        if (dto.mode === 'single') {
            if (!dto.singleRecipient) {
                throw new BadRequestException('Recipient is required in single mode');
            }
            contacts = [{
                name: dto.singleRecipient.name,
                phone: dto.singleRecipient.phone.replace(/\D/g, ''),
                status: 'pending',
            }];
        } else {
            if (!dto.contacts || dto.contacts.length === 0) {
                throw new BadRequestException('Contacts are required in bulk mode');
            }
            contacts = dto.contacts;
        }

        // Validate variable mappings if provided
        if (dto.variableMappings && dto.variableMappings.length > 0) {
            for (const mapping of dto.variableMappings) {
                if (mapping.source === 'csv' && !mapping.csvColumn) {
                    throw new BadRequestException(`Variable ${mapping.variableIndex} is missing CSV column`);
                }
                if (mapping.source === 'manual' && !mapping.manualValue) {
                    throw new BadRequestException(`Variable ${mapping.variableIndex} is missing manual value`);
                }
            }
        }

        const broadcast = this.broadcastRepository.create({
            userId,
            name: dto.name,
            wabaId: dto.wabaId,
            phoneNumberId: dto.phoneNumberId,
            templateName: dto.templateName,
            templateLanguage: dto.templateLanguage,
            templateComponents: dto.variableMappings || [],
            contacts: contacts.map(c => ({ ...c, status: 'pending' as const })),
            totalContacts: contacts.length,
            status: BroadcastStatus.PENDING,
            // New fields
            timezone: dto.timezone || 'America/Sao_Paulo',
            timeWindowStart: dto.timeWindowStart || null,
            timeWindowEnd: dto.timeWindowEnd || null,
            enableDeduplication: dto.enableDeduplication || false,
            chatwootIntegrationId: dto.chatwootIntegrationId || null,
            // Media header support
            headerMediaType: dto.headerMediaType || null,
            headerMediaUrl: dto.headerMediaUrl || null,
        });

        const saved = await this.broadcastRepository.save(broadcast);
        this.logger.log(`Created broadcast ${saved.id} with ${contacts.length} contacts in ${dto.mode} mode`);
        this.logger.log(`Variable mappings received: ${JSON.stringify(dto.variableMappings)}`);
        this.logger.log(`Template components saved: ${JSON.stringify(saved.templateComponents)}`);

        return saved;
    }

    /**
     * Start processing a broadcast
     */
    async start(broadcastId: string, userId: string): Promise<Broadcast> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status !== BroadcastStatus.PENDING && broadcast.status !== BroadcastStatus.SCHEDULED) {
            throw new BadRequestException(`Broadcast cannot be started - current status: ${broadcast.status}`);
        }

        // Update status
        broadcast.status = BroadcastStatus.PROCESSING;
        broadcast.startedAt = new Date();
        await this.broadcastRepository.save(broadcast);

        // Add job to queue
        await this.broadcastQueue.add('send-broadcast', {
            broadcastId: broadcast.id,
            userId,
        }, {
            attempts: 1,
            removeOnComplete: false,
        });

        this.logger.log(`Started broadcast ${broadcastId}`);
        return broadcast;
    }

    /**
     * Create and immediately start a broadcast
     */
    async createAndStart(userId: string, dto: CreateBroadcastDto): Promise<Broadcast> {
        const broadcast = await this.create(userId, dto);
        return this.start(broadcast.id, userId);
    }

    /**
     * Find broadcast by ID
     */
    async findById(id: string): Promise<Broadcast | null> {
        return this.broadcastRepository.findOne({ where: { id } });
    }

    /**
     * Find all broadcasts for a user
     */
    async findByUser(userId: string): Promise<Broadcast[]> {
        return this.broadcastRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Update broadcast status and counts
     */
    async updateStatus(
        id: string,
        status: BroadcastStatus,
        updates?: Partial<Pick<Broadcast, 'sentCount' | 'failedCount' | 'errorMessage' | 'completedAt' | 'contacts'>>,
    ): Promise<void> {
        await this.broadcastRepository.update(id, {
            status,
            ...updates,
        });
    }

    /**
     * Update a single contact's status in a broadcast
     */
    async updateContactStatus(
        broadcastId: string,
        phone: string,
        status: 'sent' | 'failed',
        messageId?: string,
        error?: string,
    ): Promise<void> {
        const broadcast = await this.findById(broadcastId);
        if (!broadcast) return;

        const contactIndex = broadcast.contacts.findIndex(c => c.phone === phone);
        if (contactIndex === -1) return;

        broadcast.contacts[contactIndex] = {
            ...broadcast.contacts[contactIndex],
            status,
            messageId,
            error,
            sentAt: new Date(),
        };

        // Update counts
        const sentCount = broadcast.contacts.filter(c => c.status === 'sent').length;
        const failedCount = broadcast.contacts.filter(c => c.status === 'failed').length;

        await this.broadcastRepository.update(broadcastId, {
            contacts: broadcast.contacts,
            sentCount,
            failedCount,
        });
    }

    /**
     * Cancel a broadcast
     */
    async cancel(broadcastId: string, userId: string): Promise<Broadcast> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status === BroadcastStatus.COMPLETED || broadcast.status === BroadcastStatus.CANCELLED) {
            throw new BadRequestException(`Broadcast cannot be cancelled - current status: ${broadcast.status}`);
        }

        broadcast.status = BroadcastStatus.CANCELLED;
        broadcast.completedAt = new Date();

        await this.broadcastRepository.save(broadcast);
        this.logger.log(`Cancelled broadcast ${broadcastId}`);

        return broadcast;
    }

    /**
     * Delete a broadcast
     */
    async delete(broadcastId: string, userId: string): Promise<void> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status === BroadcastStatus.PROCESSING) {
            throw new BadRequestException('Cannot delete a broadcast that is currently processing');
        }

        await this.broadcastRepository.delete(broadcastId);
        this.logger.log(`Deleted broadcast ${broadcastId}`);
    }

    // ========================================
    // SCHEDULING METHODS
    // ========================================

    /**
     * Schedule a broadcast for later
     */
    async schedule(userId: string, dto: CreateBroadcastDto): Promise<Broadcast> {
        if (!dto.scheduledAt) {
            throw new BadRequestException('scheduledAt is required for scheduling');
        }

        const scheduledDate = new Date(dto.scheduledAt);
        if (scheduledDate <= new Date()) {
            throw new BadRequestException('Scheduled time must be in the future');
        }

        let contacts: BroadcastContact[];

        if (dto.mode === 'single') {
            if (!dto.singleRecipient) {
                throw new BadRequestException('Recipient is required in single mode');
            }
            contacts = [{
                name: dto.singleRecipient.name,
                phone: dto.singleRecipient.phone.replace(/\D/g, ''),
                status: 'pending',
            }];
        } else {
            if (!dto.contacts || dto.contacts.length === 0) {
                throw new BadRequestException('Contacts are required in bulk mode');
            }
            contacts = dto.contacts;
        }

        const broadcast = this.broadcastRepository.create({
            userId,
            name: dto.name,
            wabaId: dto.wabaId,
            phoneNumberId: dto.phoneNumberId,
            templateName: dto.templateName,
            templateLanguage: dto.templateLanguage,
            templateComponents: dto.variableMappings || [],
            contacts: contacts.map(c => ({ ...c, status: 'pending' as const })),
            totalContacts: contacts.length,
            status: BroadcastStatus.SCHEDULED,
            scheduledAt: scheduledDate,
            timezone: dto.timezone || 'America/Sao_Paulo',
            timeWindowStart: dto.timeWindowStart || null,
            timeWindowEnd: dto.timeWindowEnd || null,
            enableDeduplication: dto.enableDeduplication || false,
            chatwootIntegrationId: dto.chatwootIntegrationId || null,
            // Media header support
            headerMediaType: dto.headerMediaType || null,
            headerMediaUrl: dto.headerMediaUrl || null,
        });

        const saved = await this.broadcastRepository.save(broadcast);
        this.logger.log(`Scheduled broadcast ${saved.id} for ${scheduledDate.toISOString()}`);

        return saved;
    }

    /**
     * Find broadcasts due to start
     */
    async findDueScheduledBroadcasts(): Promise<Broadcast[]> {
        return this.broadcastRepository.find({
            where: {
                status: BroadcastStatus.SCHEDULED,
                scheduledAt: LessThanOrEqual(new Date()),
            },
        });
    }

    /**
     * Find paused broadcasts
     */
    async findPausedBroadcasts(): Promise<Broadcast[]> {
        return this.broadcastRepository.find({
            where: {
                status: BroadcastStatus.PAUSED,
            },
        });
    }

    // ========================================
    // TIME WINDOW METHODS
    // ========================================

    /**
     * Check if current time is within broadcast time window
     */
    isWithinTimeWindow(broadcast: Broadcast): boolean {
        if (!broadcast.timeWindowStart || !broadcast.timeWindowEnd) {
            return true; // No window configured, always within
        }

        const now = new Date();
        // Convert to timezone (simplified - uses local time)
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        const currentTime = currentHours * 60 + currentMinutes;

        const [startHours, startMinutes] = broadcast.timeWindowStart.split(':').map(Number);
        const [endHours, endMinutes] = broadcast.timeWindowEnd.split(':').map(Number);

        const startTime = startHours * 60 + startMinutes;
        const endTime = endHours * 60 + endMinutes;

        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * Pause a broadcast
     */
    async pauseBroadcast(broadcastId: string): Promise<void> {
        await this.broadcastRepository.update(broadcastId, {
            status: BroadcastStatus.PAUSED,
        });
        this.logger.log(`Paused broadcast ${broadcastId}`);
    }

    /**
     * Resume a paused broadcast
     */
    async resumeBroadcast(broadcastId: string): Promise<Broadcast> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status !== BroadcastStatus.PAUSED) {
            throw new BadRequestException(`Cannot resume broadcast with status: ${broadcast.status}`);
        }

        broadcast.status = BroadcastStatus.PROCESSING;
        await this.broadcastRepository.save(broadcast);

        // Add back to queue
        await this.broadcastQueue.add('send-broadcast', {
            broadcastId: broadcast.id,
            userId: broadcast.userId,
        }, {
            attempts: 1,
            removeOnComplete: false,
        });

        this.logger.log(`Resumed broadcast ${broadcastId} from index ${broadcast.currentIndex}`);
        return broadcast;
    }

    /**
     * Update current index for pause/resume
     */
    async updateCurrentIndex(broadcastId: string, index: number): Promise<void> {
        await this.broadcastRepository.update(broadcastId, {
            currentIndex: index,
        });
    }

    // ========================================
    // DEDUPLICATION METHODS
    // ========================================

    /**
     * Check for duplicate contacts based on broadcast name
     */
    async checkDuplicates(
        userId: string,
        broadcastName: string,
        contacts: BroadcastContact[],
    ): Promise<DuplicateCheckResult> {
        const phones = contacts.map(c => c.phone);

        const existingRecords = await this.broadcastHistoryRepository.find({
            where: {
                userId,
                broadcastName,
                contactPhone: In(phones),
            },
        });

        const existingPhones = new Set(existingRecords.map(r => r.contactPhone));
        const duplicatePhones = phones.filter(p => existingPhones.has(p));

        return {
            duplicateCount: duplicatePhones.length,
            uniqueCount: phones.length - duplicatePhones.length,
            duplicatePhones,
        };
    }

    /**
     * Record sent contact for deduplication
     */
    async recordSentContact(
        userId: string,
        broadcastName: string,
        phone: string,
    ): Promise<void> {
        const record = this.broadcastHistoryRepository.create({
            userId,
            broadcastName,
            contactPhone: phone,
            sentAt: new Date(),
        });
        await this.broadcastHistoryRepository.save(record);
    }

    /**
     * Check if a single contact is duplicate
     */
    async isContactDuplicate(
        userId: string,
        broadcastName: string,
        phone: string,
    ): Promise<boolean> {
        const existing = await this.broadcastHistoryRepository.findOne({
            where: {
                userId,
                broadcastName,
                contactPhone: phone,
            },
        });
        return !!existing;
    }

    // ========================================
    // CHATWOOT SYNC METHODS
    // ========================================

    /**
     * Check contacts in Chatwoot without creating a broadcast
     * Called when CSV is uploaded to preview sync status
     */
    async checkChatwootContacts(
        userId: string,
        dto: CheckChatwootContactsDto,
    ): Promise<ChatwootSyncResult> {
        const integration = await this.integrationsService.findChatwootById(
            dto.chatwootIntegrationId,
            userId,
        );

        if (!integration) {
            throw new BadRequestException('Chatwoot integration not found');
        }

        const chatwootUrl = integration.storeUrl;
        const accessToken = integration.consumerKey;
        const accountId = integration.metadata?.accountId;

        if (!accountId) {
            throw new BadRequestException('Chatwoot accountId not configured');
        }

        const result: ChatwootSyncResult = {
            synced: 0,
            missing: 0,
            created: 0,
            errors: 0,
            errorDetails: [],
            contacts: [],
        };

        for (const contact of dto.contacts) {
            try {
                const chatwootContact = await this.chatwootService.findContactByPhone(
                    chatwootUrl,
                    accessToken,
                    accountId,
                    contact.phone,
                );

                if (chatwootContact) {
                    result.contacts.push({
                        ...contact,
                        chatwootContactId: chatwootContact.id,
                        chatwootSyncStatus: 'synced',
                    });
                    result.synced++;
                } else {
                    result.contacts.push({
                        ...contact,
                        chatwootSyncStatus: 'missing',
                    });
                    result.missing++;
                }
            } catch (error) {
                result.contacts.push({
                    ...contact,
                    chatwootSyncStatus: 'error',
                    chatwootError: error.message,
                });
                result.errors++;
                result.errorDetails.push({
                    phone: contact.phone,
                    error: error.message,
                });
            }
        }

        this.logger.log(`Chatwoot check: ${result.synced} synced, ${result.missing} missing, ${result.errors} errors`);

        return result;
    }

    /**
     * Create missing contacts in Chatwoot (standalone, without broadcast)
     */
    async createChatwootContactsStandalone(
        userId: string,
        chatwootIntegrationId: string,
        contacts: Array<{ name: string; phone: string; chatwootSyncStatus?: 'synced' | 'missing' | 'created' | 'error' }>,
    ): Promise<ChatwootSyncResult> {
        const integration = await this.integrationsService.findChatwootById(
            chatwootIntegrationId,
            userId,
        );

        if (!integration) {
            throw new BadRequestException('Chatwoot integration not found');
        }

        const chatwootUrl = integration.storeUrl;
        const accessToken = integration.consumerKey;
        const accountId = integration.metadata?.accountId;

        if (!accountId) {
            throw new BadRequestException('Chatwoot accountId not configured');
        }

        const result: ChatwootSyncResult = {
            synced: 0,
            missing: 0,
            created: 0,
            errors: 0,
            errorDetails: [],
            contacts: [],
        };

        for (const contact of contacts) {
            if (contact.chatwootSyncStatus === 'missing') {
                try {
                    const newContact = await this.chatwootService.createContact(
                        chatwootUrl,
                        accessToken,
                        accountId,
                        {
                            name: contact.name,
                            phone_number: contact.phone,
                        },
                    );

                    result.contacts.push({
                        ...contact,
                        chatwootContactId: newContact.id,
                        chatwootSyncStatus: 'created',
                    });
                    result.created++;
                } catch (error) {
                    result.contacts.push({
                        ...contact,
                        chatwootSyncStatus: 'error',
                        chatwootError: error.message,
                    });
                    result.errors++;
                    result.errorDetails.push({
                        phone: contact.phone,
                        error: error.message,
                    });
                }
            } else {
                result.contacts.push(contact);
                if (contact.chatwootSyncStatus === 'synced') {
                    result.synced++;
                }
            }
        }

        this.logger.log(`Chatwoot create: ${result.created} created, ${result.errors} errors`);

        return result;
    }

    /**
     * Sync contacts with Chatwoot - check which exist
     */
    async syncContactsWithChatwoot(
        broadcastId: string,
        userId: string,
    ): Promise<ChatwootSyncResult> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast || broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        const chatwootIntegration = await this.integrationsService.findActiveChatwoot(userId);

        if (!chatwootIntegration) {
            throw new BadRequestException('No active Chatwoot integration found');
        }

        const chatwootUrl = chatwootIntegration.storeUrl;
        const accessToken = chatwootIntegration.consumerKey;
        const accountId = chatwootIntegration.metadata?.accountId;

        if (!accountId) {
            throw new BadRequestException('Chatwoot accountId not configured');
        }

        const result: ChatwootSyncResult = {
            synced: 0,
            missing: 0,
            created: 0,
            errors: 0,
            errorDetails: [],
            contacts: [...broadcast.contacts],
        };

        for (let i = 0; i < result.contacts.length; i++) {
            const contact = result.contacts[i];

            try {
                const chatwootContact = await this.chatwootService.findContactByPhone(
                    chatwootUrl,
                    accessToken,
                    accountId,
                    contact.phone,
                );

                if (chatwootContact) {
                    result.contacts[i] = {
                        ...contact,
                        chatwootContactId: chatwootContact.id,
                        chatwootSyncStatus: 'synced',
                    };
                    result.synced++;
                } else {
                    result.contacts[i] = {
                        ...contact,
                        chatwootSyncStatus: 'missing',
                    };
                    result.missing++;
                }
            } catch (error) {
                result.contacts[i] = {
                    ...contact,
                    chatwootSyncStatus: 'error',
                    chatwootError: error.message,
                };
                result.errors++;
                result.errorDetails.push({
                    phone: contact.phone,
                    error: error.message,
                });
            }
        }

        // Update broadcast contacts
        await this.broadcastRepository.update(broadcastId, {
            contacts: result.contacts,
        });

        this.logger.log(`Chatwoot sync for broadcast ${broadcastId}: ${result.synced} synced, ${result.missing} missing`);

        return result;
    }

    /**
     * Create missing contacts in Chatwoot
     */
    async createMissingChatwootContacts(
        broadcastId: string,
        userId: string,
    ): Promise<ChatwootSyncResult> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast || broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        const chatwootIntegration = await this.integrationsService.findActiveChatwoot(userId);

        if (!chatwootIntegration) {
            throw new BadRequestException('No active Chatwoot integration found');
        }

        const chatwootUrl = chatwootIntegration.storeUrl;
        const accessToken = chatwootIntegration.consumerKey;
        const accountId = chatwootIntegration.metadata?.accountId;

        if (!accountId) {
            throw new BadRequestException('Chatwoot accountId not configured');
        }

        const result: ChatwootSyncResult = {
            synced: 0,
            missing: 0,
            created: 0,
            errors: 0,
            errorDetails: [],
            contacts: [...broadcast.contacts],
        };

        for (let i = 0; i < result.contacts.length; i++) {
            const contact = result.contacts[i];

            if (contact.chatwootSyncStatus === 'missing') {
                try {
                    const newContact = await this.chatwootService.createContact(
                        chatwootUrl,
                        accessToken,
                        accountId,
                        {
                            name: contact.name,
                            phone_number: contact.phone,
                        },
                    );

                    result.contacts[i] = {
                        ...contact,
                        chatwootContactId: newContact.id,
                        chatwootSyncStatus: 'created',
                    };
                    result.created++;
                } catch (error) {
                    result.contacts[i] = {
                        ...contact,
                        chatwootSyncStatus: 'error',
                        chatwootError: error.message,
                    };
                    result.errors++;
                    result.errorDetails.push({
                        phone: contact.phone,
                        error: error.message,
                    });
                }
            } else if (contact.chatwootSyncStatus === 'synced' || contact.chatwootSyncStatus === 'created') {
                result.synced++;
            }
        }

        // Update broadcast contacts
        await this.broadcastRepository.update(broadcastId, {
            contacts: result.contacts,
        });

        this.logger.log(`Created ${result.created} Chatwoot contacts for broadcast ${broadcastId}`);

        return result;
    }

    // ========================================
    // TEMPLATE PREVIEW METHOD
    // ========================================

    /**
     * Generate template preview with filled variables
     */
    async generateTemplatePreview(
        userId: string,
        dto: TemplatePreviewDto,
    ): Promise<PreviewResult> {
        // For now, we'll do a simple variable substitution
        // In production, you might want to fetch the actual template from WhatsApp
        const sampleContact = dto.sampleContact || {
            name: 'João Silva',
            phone: '5511999999999',
            var1: 'Valor1',
            var2: 'Valor2',
            var3: 'Valor3',
        };

        let bodyText = `Template: ${dto.templateName} (${dto.templateLanguage})`;
        let headerText: string | undefined;

        // Build preview based on mappings
        const headerMappings = dto.variableMappings.filter(m => m.componentType === 'HEADER');
        const bodyMappings = dto.variableMappings.filter(m => m.componentType === 'BODY');

        if (headerMappings.length > 0) {
            headerText = 'Header: ';
            headerMappings.forEach((m, idx) => {
                const value = m.source === 'manual'
                    ? m.manualValue
                    : sampleContact[m.csvColumn || ''] || `{{${m.variableIndex}}}`;
                headerText += `${idx > 0 ? ', ' : ''}{{${m.variableIndex}}} = ${value}`;
            });
        }

        if (bodyMappings.length > 0) {
            bodyText += '\n\nVariáveis do corpo:\n';
            bodyMappings.forEach(m => {
                const value = m.source === 'manual'
                    ? m.manualValue
                    : sampleContact[m.csvColumn || ''] || `{{${m.variableIndex}}}`;
                bodyText += `{{${m.variableIndex}}} = ${value}\n`;
            });
        }

        return {
            headerText,
            bodyText,
            footerText: undefined,
            buttons: [],
        };
    }

    // ========================================
    // RETRY FAILED METHOD
    // ========================================

    /**
     * Retry failed messages in a broadcast
     */
    async retryFailed(broadcastId: string, userId: string): Promise<Broadcast> {
        const broadcast = await this.findById(broadcastId);

        if (!broadcast || broadcast.userId !== userId) {
            throw new NotFoundException('Broadcast not found');
        }

        if (broadcast.status !== BroadcastStatus.COMPLETED && broadcast.status !== BroadcastStatus.FAILED) {
            throw new BadRequestException('Can only retry failed messages from completed or failed broadcasts');
        }

        const failedContacts = broadcast.contacts.filter(c => c.status === 'failed');

        if (failedContacts.length === 0) {
            throw new BadRequestException('No failed contacts to retry');
        }

        // Reset failed contacts to pending
        const updatedContacts = broadcast.contacts.map(c =>
            c.status === 'failed'
                ? { ...c, status: 'pending' as const, error: undefined, retryAttempts: (c.retryAttempts || 0) + 1 }
                : c
        );

        broadcast.contacts = updatedContacts;
        broadcast.status = BroadcastStatus.PROCESSING;
        broadcast.currentIndex = broadcast.contacts.findIndex(c => c.status === 'pending');

        await this.broadcastRepository.save(broadcast);

        // Add job to queue
        await this.broadcastQueue.add('send-broadcast', {
            broadcastId: broadcast.id,
            userId,
            retryMode: true,
        }, {
            attempts: 1,
            removeOnComplete: false,
        });

        this.logger.log(`Retrying ${failedContacts.length} failed contacts in broadcast ${broadcastId}`);
        return broadcast;
    }

    // ========================================
    // ANALYTICS METHODS
    // ========================================

    /**
     * Get broadcast analytics
     */
    async getAnalytics(userId: string, filters?: AnalyticsFilters): Promise<AnalyticsResult> {
        const queryBuilder = this.broadcastRepository.createQueryBuilder('b')
            .where('b.user_id = :userId', { userId });

        if (filters?.startDate) {
            queryBuilder.andWhere('b.created_at >= :startDate', { startDate: filters.startDate });
        }

        if (filters?.endDate) {
            queryBuilder.andWhere('b.created_at <= :endDate', { endDate: filters.endDate });
        }

        if (filters?.status) {
            queryBuilder.andWhere('b.status = :status', { status: filters.status });
        }

        const broadcasts = await queryBuilder
            .orderBy('b.created_at', 'DESC')
            .getMany();

        const totalBroadcasts = broadcasts.length;
        const totalSent = broadcasts.reduce((sum, b) => sum + b.sentCount, 0);
        const totalFailed = broadcasts.reduce((sum, b) => sum + b.failedCount, 0);
        const totalSkipped = broadcasts.reduce((sum, b) => {
            return sum + b.contacts.filter(c => c.status === 'skipped').length;
        }, 0);

        const totalAttempted = totalSent + totalFailed;
        const successRate = totalAttempted > 0
            ? Math.round((totalSent / totalAttempted) * 100)
            : 0;

        const byStatus: { [key: string]: number } = {};
        broadcasts.forEach(b => {
            byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        });

        const recentBroadcasts = broadcasts.slice(0, 10).map(b => ({
            id: b.id,
            name: b.name,
            status: b.status,
            sentCount: b.sentCount,
            failedCount: b.failedCount,
            createdAt: b.createdAt.toISOString(),
        }));

        return {
            totalBroadcasts,
            totalSent,
            totalFailed,
            totalSkipped,
            successRate,
            byStatus,
            recentBroadcasts,
        };
    }
}
