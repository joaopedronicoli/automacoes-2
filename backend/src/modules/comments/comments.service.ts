import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInteraction, InteractionType } from '../../entities/contact-interaction.entity';
import { Contact } from '../../entities/contact.entity';
import { Post } from '../../entities/post.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { FacebookService } from '../platforms/facebook/facebook.service';

interface CommentsFilter {
    status?: 'all' | 'unreplied' | 'replied';
    search?: string;
    accountId?: string;
    platform?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

@Injectable()
export class CommentsService {
    private readonly logger = new Logger(CommentsService.name);

    constructor(
        @InjectRepository(ContactInteraction)
        private interactionRepo: Repository<ContactInteraction>,
        @InjectRepository(Contact)
        private contactRepo: Repository<Contact>,
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(SocialAccount)
        private socialAccountRepo: Repository<SocialAccount>,
        @Inject(forwardRef(() => FacebookService))
        private facebookService: FacebookService,
    ) {}

    async getComments(userId: string, filters: CommentsFilter) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;

        const qb = this.interactionRepo
            .createQueryBuilder('ci')
            .innerJoinAndSelect('ci.contact', 'contact')
            .where('contact.user_id = :userId', { userId })
            .andWhere('ci.type = :type', { type: InteractionType.COMMENT });

        // Status filter
        if (filters.status === 'unreplied') {
            qb.andWhere('ci.replied_at IS NULL');
        } else if (filters.status === 'replied') {
            qb.andWhere('ci.replied_at IS NOT NULL');
        }

        // Search filter
        if (filters.search) {
            qb.andWhere(
                '(ci.content ILIKE :search OR contact.name ILIKE :search OR contact.username ILIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        // Account filter
        if (filters.accountId) {
            qb.andWhere('contact.social_account_id = :accountId', { accountId: filters.accountId });
        }

        // Platform filter
        if (filters.platform) {
            qb.andWhere('contact.platform = :platform', { platform: filters.platform });
        }

        // Date filters
        if (filters.dateFrom) {
            qb.andWhere('ci.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
        }
        if (filters.dateTo) {
            qb.andWhere('ci.created_at <= :dateTo', { dateTo: filters.dateTo });
        }

        qb.orderBy('ci.createdAt', 'DESC');

        const [entities, total] = await qb.skip(skip).take(limit).getManyAndCount();

        // Batch-load posts for comments that have a postId
        const postMap = new Map<string, Post>();
        const postKeys = entities
            .filter((ci) => ci.postId && ci.contact?.socialAccountId)
            .map((ci) => ({ postId: ci.postId, accountId: ci.contact.socialAccountId }));

        if (postKeys.length > 0) {
            const uniquePostIds = [...new Set(postKeys.map((k) => k.postId))];
            const posts = await this.postRepo
                .createQueryBuilder('post')
                .where('post.platform_post_id IN (:...postIds)', { postIds: uniquePostIds })
                .getMany();

            for (const post of posts) {
                postMap.set(`${post.platformPostId}:${post.socialAccountId}`, post);
            }
        }

        const result = entities.map((ci) => {
            const post = ci.postId && ci.contact?.socialAccountId
                ? postMap.get(`${ci.postId}:${ci.contact.socialAccountId}`) || null
                : null;

            return {
                id: ci.id,
                content: ci.content,
                externalId: ci.externalId,
                postId: ci.postId,
                repliedAt: ci.repliedAt,
                createdAt: ci.createdAt,
                contact: {
                    id: ci.contact.id,
                    name: ci.contact.name,
                    username: ci.contact.username,
                    avatar: ci.contact.avatar,
                    platform: ci.contact.platform,
                    platformUserId: ci.contact.platformUserId,
                    socialAccountId: ci.contact.socialAccountId,
                },
                post: post
                    ? {
                          id: post.id,
                          content: post.content,
                          mediaUrl: post.mediaUrl,
                          thumbnailUrl: post.thumbnailUrl,
                          platformPostId: post.platformPostId,
                      }
                    : null,
            };
        });

        return {
            comments: result,
            total,
            pages: Math.ceil(total / limit),
        };
    }

    async getStats(userId: string) {
        const baseQb = this.interactionRepo
            .createQueryBuilder('ci')
            .innerJoin('ci.contact', 'contact')
            .where('contact.user_id = :userId', { userId })
            .andWhere('ci.type = :type', { type: InteractionType.COMMENT });

        const totalComments = await baseQb.getCount();

        const unreplied = await baseQb
            .clone()
            .andWhere('ci.replied_at IS NULL')
            .getCount();

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const repliedToday = await baseQb
            .clone()
            .andWhere('ci.replied_at >= :todayStart', { todayStart })
            .getCount();

        const commentsToday = await baseQb
            .clone()
            .andWhere('ci.created_at >= :todayStart', { todayStart })
            .getCount();

        return { totalComments, unreplied, repliedToday, commentsToday };
    }

    async replyToComment(userId: string, interactionId: string, message: string) {
        const interaction = await this.interactionRepo.findOne({
            where: { id: interactionId },
            relations: ['contact'],
        });

        if (!interaction) {
            throw new NotFoundException('Comentário não encontrado');
        }

        const contact = interaction.contact;
        if (contact.userId !== userId) {
            throw new ForbiddenException('Sem permissão');
        }

        const socialAccount = await this.socialAccountRepo.findOne({
            where: { id: contact.socialAccountId },
        });

        if (!socialAccount) {
            throw new NotFoundException('Conta social não encontrada');
        }

        if (contact.platform === 'facebook') {
            await this.facebookService.replyToComment(
                interaction.externalId,
                message,
                socialAccount.accessToken,
            );
        } else {
            await this.facebookService.replyToInstagramComment(
                interaction.externalId,
                message,
                socialAccount.accessToken,
            );
        }

        interaction.repliedAt = new Date();
        await this.interactionRepo.save(interaction);

        return { success: true };
    }

    async sendDm(userId: string, interactionId: string, message: string) {
        const interaction = await this.interactionRepo.findOne({
            where: { id: interactionId },
            relations: ['contact'],
        });

        if (!interaction) {
            throw new NotFoundException('Comentário não encontrado');
        }

        const contact = interaction.contact;
        if (contact.userId !== userId) {
            throw new ForbiddenException('Sem permissão');
        }

        const socialAccount = await this.socialAccountRepo.findOne({
            where: { id: contact.socialAccountId },
        });

        if (!socialAccount) {
            throw new NotFoundException('Conta social não encontrada');
        }

        if (contact.platform === 'facebook') {
            await this.facebookService.sendPrivateMessage(
                socialAccount.accountId,
                contact.platformUserId,
                message,
                socialAccount.accessToken,
            );
        } else {
            const linkedPageId = socialAccount.metadata?.linked_page_id;
            await this.facebookService.sendInstagramMessage(
                socialAccount.accountId,
                contact.platformUserId,
                message,
                socialAccount.accessToken,
                linkedPageId,
            );
        }

        return { success: true };
    }
}
