import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Broadcast, BroadcastStatus, BroadcastContact } from '../../entities/broadcast.entity';

export interface CreateBroadcastDto {
    name: string;
    wabaId: string;
    phoneNumberId: string;
    templateName: string;
    templateLanguage: string;
    templateComponents?: any[];
    contacts: BroadcastContact[];
}

export interface ParsedCSVResult {
    contacts: BroadcastContact[];
    errors: string[];
    totalRows: number;
    validRows: number;
}

@Injectable()
export class BroadcastService {
    private readonly logger = new Logger(BroadcastService.name);

    constructor(
        @InjectRepository(Broadcast)
        private broadcastRepository: Repository<Broadcast>,
        @InjectQueue('broadcast')
        private broadcastQueue: Queue,
    ) {}

    /**
     * Parse CSV content and extract contacts
     */
    parseCSV(csvContent: string): ParsedCSVResult {
        const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
        const contacts: BroadcastContact[] = [];
        const errors: string[] = [];

        if (lines.length === 0) {
            return { contacts: [], errors: ['CSV file is empty'], totalRows: 0, validRows: 0 };
        }

        // Try to detect header row
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('name') || firstLine.includes('nome') ||
                          firstLine.includes('phone') || firstLine.includes('telefone');

        const startIndex = hasHeader ? 1 : 0;
        const totalRows = lines.length - startIndex;

        // Try to detect delimiter
        const delimiter = lines[0].includes(';') ? ';' : ',';

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(delimiter).map(part => part.trim().replace(/^["']|["']$/g, ''));

            if (parts.length < 2) {
                errors.push(`Line ${i + 1}: Invalid format - expected at least 2 columns`);
                continue;
            }

            const [name, phone] = parts;

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

            contacts.push({
                name,
                phone: cleanPhone,
                status: 'pending',
            });
        }

        return {
            contacts,
            errors,
            totalRows,
            validRows: contacts.length,
        };
    }

    /**
     * Create a new broadcast
     */
    async create(userId: string, dto: CreateBroadcastDto): Promise<Broadcast> {
        if (!dto.contacts || dto.contacts.length === 0) {
            throw new BadRequestException('At least one contact is required');
        }

        const broadcast = this.broadcastRepository.create({
            userId,
            name: dto.name,
            wabaId: dto.wabaId,
            phoneNumberId: dto.phoneNumberId,
            templateName: dto.templateName,
            templateLanguage: dto.templateLanguage,
            templateComponents: dto.templateComponents || [],
            contacts: dto.contacts.map(c => ({ ...c, status: 'pending' as const })),
            totalContacts: dto.contacts.length,
            status: BroadcastStatus.PENDING,
        });

        const saved = await this.broadcastRepository.save(broadcast);
        this.logger.log(`Created broadcast ${saved.id} with ${dto.contacts.length} contacts`);

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

        if (broadcast.status !== BroadcastStatus.PENDING) {
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
}
