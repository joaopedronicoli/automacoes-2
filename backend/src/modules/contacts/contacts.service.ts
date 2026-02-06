import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, LessThan, MoreThan } from 'typeorm';
import { Contact, HeatLevel, LifecycleStage } from '../../entities/contact.entity';
import { ContactInteraction, InteractionType } from '../../entities/contact-interaction.entity';
import { ContactTag } from '../../entities/contact-tag.entity';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';

// Score points for each interaction type
const SCORE_POINTS = {
    [InteractionType.DM_RECEIVED]: 5,
    [InteractionType.DM_SENT]: 3,
    [InteractionType.COMMENT]: 2,
    [InteractionType.COMMENT_REPLY]: 2,
    [InteractionType.MENTION]: 3,
    [InteractionType.STORY_REPLY]: 4,
    [InteractionType.STORY_MENTION]: 3,
    [InteractionType.AUTOMATION_TRIGGERED]: 1,
};

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);

    constructor(
        @InjectRepository(Contact)
        private contactRepository: Repository<Contact>,
        @InjectRepository(ContactInteraction)
        private interactionRepository: Repository<ContactInteraction>,
        @InjectRepository(ContactTag)
        private tagRepository: Repository<ContactTag>,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
    ) {}

    /**
     * Get all contacts for a user with filters
     */
    async getContacts(
        userId: string,
        options: {
            page?: number;
            limit?: number;
            search?: string;
            platform?: string;
            heatLevel?: HeatLevel;
            lifecycleStage?: LifecycleStage;
            tags?: string[];
            sortBy?: string;
            sortOrder?: 'ASC' | 'DESC';
        } = {},
    ): Promise<{ contacts: Contact[]; total: number; pages: number }> {
        const {
            page = 1,
            limit = 20,
            search,
            platform,
            heatLevel,
            lifecycleStage,
            tags,
            sortBy = 'lastInteractionAt',
            sortOrder = 'DESC',
        } = options;

        const query = this.contactRepository
            .createQueryBuilder('contact')
            .where('contact.user_id = :userId', { userId });

        if (search) {
            query.andWhere(
                '(contact.username ILIKE :search OR contact.name ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (platform) {
            query.andWhere('contact.platform = :platform', { platform });
        }

        if (heatLevel) {
            query.andWhere('contact.heat_level = :heatLevel', { heatLevel });
        }

        if (lifecycleStage) {
            query.andWhere('contact.lifecycle_stage = :lifecycleStage', { lifecycleStage });
        }

        if (tags && tags.length > 0) {
            query.andWhere('contact.tags && :tags', { tags });
        }

        const total = await query.getCount();
        const pages = Math.ceil(total / limit);

        query
            .orderBy(`contact.${sortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const contacts = await query.getMany();

        return { contacts, total, pages };
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string, userId: string): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
            relations: ['socialAccount'],
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return contact;
    }

    /**
     * Get contact interactions/timeline
     */
    async getContactInteractions(
        contactId: string,
        userId: string,
        limit = 50,
        offset = 0,
    ): Promise<ContactInteraction[]> {
        // Verify contact belongs to user
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        return this.interactionRepository.find({
            where: { contactId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    /**
     * Find or create a contact from an interaction
     */
    async findOrCreateContact(data: {
        userId: string;
        socialAccountId: string;
        platform: string;
        platformUserId: string;
        username?: string;
        name?: string;
        avatar?: string;
        followerCount?: number;
        isVerified?: boolean;
    }): Promise<Contact> {
        let contact = await this.contactRepository.findOne({
            where: {
                userId: data.userId,
                platformUserId: data.platformUserId,
                platform: data.platform,
            },
        });

        if (!contact) {
            contact = this.contactRepository.create({
                userId: data.userId,
                socialAccountId: data.socialAccountId,
                platform: data.platform,
                platformUserId: data.platformUserId,
                username: data.username,
                name: data.name,
                avatar: data.avatar,
                followerCount: data.followerCount || 0,
                isVerified: data.isVerified || false,
                heatLevel: HeatLevel.COLD,
                lifecycleStage: LifecycleStage.LEAD,
            });

            contact = await this.contactRepository.save(contact);
            this.logger.log(`Created new contact ${contact.id} for ${data.platform} user ${data.platformUserId}`);
        } else {
            // Update contact info if provided
            let updated = false;
            if (data.username && data.username !== contact.username) {
                contact.username = data.username;
                updated = true;
            }
            if (data.name && data.name !== contact.name) {
                contact.name = data.name;
                updated = true;
            }
            if (data.avatar && data.avatar !== contact.avatar) {
                contact.avatar = data.avatar;
                updated = true;
            }
            if (data.followerCount && data.followerCount !== contact.followerCount) {
                contact.followerCount = data.followerCount;
                updated = true;
            }
            if (data.isVerified !== undefined && data.isVerified !== contact.isVerified) {
                contact.isVerified = data.isVerified;
                updated = true;
            }

            if (updated) {
                await this.contactRepository.save(contact);
            }
        }

        return contact;
    }

    /**
     * Record an interaction and update contact score
     */
    async recordInteraction(data: {
        contactId: string;
        type: InteractionType;
        content?: string;
        postId?: string;
        conversationId?: string;
        externalId?: string;
        metadata?: Record<string, any>;
    }): Promise<ContactInteraction> {
        const contact = await this.contactRepository.findOne({
            where: { id: data.contactId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        // Check for duplicate interaction
        if (data.externalId) {
            const existing = await this.interactionRepository.findOne({
                where: { contactId: data.contactId, externalId: data.externalId },
            });
            if (existing) {
                return existing;
            }
        }

        // Calculate score for this interaction
        const baseScore = SCORE_POINTS[data.type] || 1;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Recency multiplier: 2x if within last 7 days
        const recencyMultiplier = 2;
        const scoreAwarded = baseScore * recencyMultiplier;

        // Create interaction
        const interaction = this.interactionRepository.create({
            contactId: data.contactId,
            type: data.type,
            content: data.content,
            postId: data.postId,
            conversationId: data.conversationId,
            externalId: data.externalId,
            metadata: data.metadata,
            scoreAwarded,
        });

        await this.interactionRepository.save(interaction);

        // Update contact stats
        contact.totalInteractions += 1;
        contact.leadScore += scoreAwarded;
        contact.lastInteractionAt = now;

        if (!contact.firstInteractionAt) {
            contact.firstInteractionAt = now;
        }

        // Update specific counters
        if (data.type === InteractionType.COMMENT || data.type === InteractionType.COMMENT_REPLY) {
            contact.totalComments += 1;
        } else if (data.type === InteractionType.DM_RECEIVED) {
            contact.totalDmsReceived += 1;
        } else if (data.type === InteractionType.DM_SENT) {
            contact.totalDmsSent += 1;
        }

        // Update heat level
        contact.heatLevel = this.calculateHeatLevel(contact);

        // Auto-upgrade lifecycle stage based on engagement
        contact.lifecycleStage = this.calculateLifecycleStage(contact);

        await this.contactRepository.save(contact);

        this.logger.log(`Recorded ${data.type} interaction for contact ${contact.id}, score: +${scoreAwarded}`);

        return interaction;
    }

    /**
     * Calculate heat level based on score and recency
     */
    private calculateHeatLevel(contact: Contact): HeatLevel {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Hot: score >= 50 OR interaction in last 24h
        if (contact.leadScore >= 50 || (contact.lastInteractionAt && contact.lastInteractionAt > oneDayAgo)) {
            return HeatLevel.HOT;
        }

        // Warm: score >= 20 OR interaction in last 7 days
        if (contact.leadScore >= 20 || (contact.lastInteractionAt && contact.lastInteractionAt > sevenDaysAgo)) {
            return HeatLevel.WARM;
        }

        // Cold: everything else
        return HeatLevel.COLD;
    }

    /**
     * Calculate lifecycle stage based on engagement
     */
    private calculateLifecycleStage(contact: Contact): LifecycleStage {
        // VIP: Very high engagement
        if (contact.leadScore >= 100 && contact.totalDmsReceived >= 5) {
            return LifecycleStage.VIP;
        }

        // Customer: Has had meaningful DM conversations
        if (contact.totalDmsReceived >= 3 && contact.totalDmsSent >= 2) {
            return LifecycleStage.CUSTOMER;
        }

        // Engaged: Multiple interactions
        if (contact.totalInteractions >= 3 || contact.leadScore >= 30) {
            return LifecycleStage.ENGAGED;
        }

        // Lead: Default
        return LifecycleStage.LEAD;
    }

    /**
     * Update contact details
     */
    async updateContact(
        contactId: string,
        userId: string,
        data: {
            lifecycleStage?: LifecycleStage;
            tags?: string[];
            notes?: string;
        },
    ): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        if (data.lifecycleStage !== undefined) {
            contact.lifecycleStage = data.lifecycleStage;
        }
        if (data.tags !== undefined) {
            contact.tags = data.tags;
        }
        if (data.notes !== undefined) {
            contact.notes = data.notes;
        }

        return this.contactRepository.save(contact);
    }

    /**
     * Add tag to contact
     */
    async addTag(contactId: string, userId: string, tag: string): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        if (!contact.tags.includes(tag)) {
            contact.tags = [...contact.tags, tag];
            await this.contactRepository.save(contact);
        }

        return contact;
    }

    /**
     * Remove tag from contact
     */
    async removeTag(contactId: string, userId: string, tag: string): Promise<Contact> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        contact.tags = contact.tags.filter(t => t !== tag);
        return this.contactRepository.save(contact);
    }

    /**
     * Send DM to contact
     */
    async sendDm(contactId: string, userId: string, message: string): Promise<any> {
        const contact = await this.contactRepository.findOne({
            where: { id: contactId, userId },
        });

        if (!contact) {
            throw new NotFoundException('Contato não encontrado');
        }

        const socialAccount = await this.socialAccountsService.findById(contact.socialAccountId);
        if (!socialAccount) {
            throw new NotFoundException('Conta social não encontrada');
        }

        let result;
        if (contact.platform === 'instagram') {
            const linkedPageId = socialAccount.metadata?.linked_page_id;
            result = await this.facebookService.sendInstagramMessage(
                socialAccount.accountId,
                contact.platformUserId,
                message,
                socialAccount.accessToken,
                linkedPageId,
            );
        } else if (contact.platform === 'facebook') {
            result = await this.facebookService.sendPrivateMessage(
                socialAccount.accountId,
                contact.platformUserId,
                message,
                socialAccount.accessToken,
            );
        } else {
            throw new Error('Plataforma não suportada');
        }

        // Record the interaction
        await this.recordInteraction({
            contactId: contact.id,
            type: InteractionType.DM_SENT,
            content: message,
        });

        return result;
    }

    // ========================================
    // TAGS MANAGEMENT
    // ========================================

    /**
     * Get all tags for a user
     */
    async getTags(userId: string): Promise<ContactTag[]> {
        return this.tagRepository.find({
            where: { userId },
            order: { name: 'ASC' },
        });
    }

    /**
     * Create a new tag
     */
    async createTag(userId: string, name: string, color?: string): Promise<ContactTag> {
        const existing = await this.tagRepository.findOne({
            where: { userId, name },
        });

        if (existing) {
            return existing;
        }

        const tag = this.tagRepository.create({
            userId,
            name,
            color: color || '#6366f1',
        });

        return this.tagRepository.save(tag);
    }

    /**
     * Delete a tag
     */
    async deleteTag(tagId: string, userId: string): Promise<void> {
        const tag = await this.tagRepository.findOne({
            where: { id: tagId, userId },
        });

        if (tag) {
            // Remove tag from all contacts
            await this.contactRepository
                .createQueryBuilder()
                .update(Contact)
                .set({ tags: () => `array_remove(tags, '${tag.name}')` })
                .where('user_id = :userId', { userId })
                .execute();

            await this.tagRepository.remove(tag);
        }
    }

    // ========================================
    // ANALYTICS
    // ========================================

    /**
     * Get contact statistics for a user
     */
    async getStats(userId: string): Promise<{
        total: number;
        byHeatLevel: Record<HeatLevel, number>;
        byLifecycleStage: Record<LifecycleStage, number>;
        byPlatform: Record<string, number>;
        recentlyActive: number;
        topEngaged: Contact[];
    }> {
        const total = await this.contactRepository.count({ where: { userId } });

        const byHeatLevel = {
            [HeatLevel.HOT]: await this.contactRepository.count({ where: { userId, heatLevel: HeatLevel.HOT } }),
            [HeatLevel.WARM]: await this.contactRepository.count({ where: { userId, heatLevel: HeatLevel.WARM } }),
            [HeatLevel.COLD]: await this.contactRepository.count({ where: { userId, heatLevel: HeatLevel.COLD } }),
        };

        const byLifecycleStage = {
            [LifecycleStage.LEAD]: await this.contactRepository.count({ where: { userId, lifecycleStage: LifecycleStage.LEAD } }),
            [LifecycleStage.ENGAGED]: await this.contactRepository.count({ where: { userId, lifecycleStage: LifecycleStage.ENGAGED } }),
            [LifecycleStage.CUSTOMER]: await this.contactRepository.count({ where: { userId, lifecycleStage: LifecycleStage.CUSTOMER } }),
            [LifecycleStage.VIP]: await this.contactRepository.count({ where: { userId, lifecycleStage: LifecycleStage.VIP } }),
        };

        const platformStats = await this.contactRepository
            .createQueryBuilder('contact')
            .select('contact.platform', 'platform')
            .addSelect('COUNT(*)', 'count')
            .where('contact.user_id = :userId', { userId })
            .groupBy('contact.platform')
            .getRawMany();

        const byPlatform: Record<string, number> = {};
        platformStats.forEach(stat => {
            byPlatform[stat.platform] = parseInt(stat.count);
        });

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentlyActive = await this.contactRepository.count({
            where: {
                userId,
                lastInteractionAt: MoreThan(sevenDaysAgo),
            },
        });

        const topEngaged = await this.contactRepository.find({
            where: { userId },
            order: { leadScore: 'DESC' },
            take: 10,
        });

        return {
            total,
            byHeatLevel,
            byLifecycleStage,
            byPlatform,
            recentlyActive,
            topEngaged,
        };
    }

    /**
     * Decay scores for inactive contacts (run daily via cron)
     */
    async decayScores(): Promise<void> {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // Decrease score by 1 for contacts inactive for more than a week
        await this.contactRepository
            .createQueryBuilder()
            .update(Contact)
            .set({ leadScore: () => 'GREATEST(lead_score - 1, 0)' })
            .where('last_interaction_at < :oneWeekAgo', { oneWeekAgo })
            .andWhere('lead_score > 0')
            .execute();

        // Update heat levels for all affected contacts
        const contacts = await this.contactRepository.find({
            where: { lastInteractionAt: LessThan(oneWeekAgo) },
        });

        for (const contact of contacts) {
            const newHeatLevel = this.calculateHeatLevel(contact);
            if (newHeatLevel !== contact.heatLevel) {
                contact.heatLevel = newHeatLevel;
                await this.contactRepository.save(contact);
            }
        }

        this.logger.log(`Decayed scores for ${contacts.length} inactive contacts`);
    }
}
