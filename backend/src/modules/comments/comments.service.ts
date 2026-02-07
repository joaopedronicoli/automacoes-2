import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInteraction, InteractionType } from '../../entities/contact-interaction.entity';
import { Contact } from '../../entities/contact.entity';
import { Post } from '../../entities/post.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';

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
        private socialAccountsService: SocialAccountsService,
    ) {}

    async getCommentsGrouped(userId: string, filters: CommentsFilter) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        // Get connected account IDs to exclude their comments
        const connectedAccounts = await this.socialAccountsService.findByUser(userId);
        const connectedAccountIds = connectedAccounts.map(a => a.accountId);

        // Step 1: Get grouped post_ids with pagination
        const groupQb = this.interactionRepo
            .createQueryBuilder('ci')
            .innerJoin('ci.contact', 'contact')
            .select('COALESCE(ci.post_id, \'__no_post__\')', 'postKey')
            .addSelect('MAX(ci.created_at)', 'latestComment')
            .addSelect('COUNT(*)::int', 'commentCount')
            .where('contact.user_id = :userId', { userId })
            .andWhere('ci.type = :type', { type: InteractionType.COMMENT });

        // Exclude comments from the connected accounts themselves
        if (connectedAccountIds.length > 0) {
            groupQb.andWhere('contact.platform_user_id NOT IN (:...connectedAccountIds)', { connectedAccountIds });
        }

        if (filters.status === 'unreplied') {
            groupQb.andWhere('ci.replied_at IS NULL');
        } else if (filters.status === 'replied') {
            groupQb.andWhere('ci.replied_at IS NOT NULL');
        }

        if (filters.search) {
            groupQb.andWhere(
                '(ci.content ILIKE :search OR contact.name ILIKE :search OR contact.username ILIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        if (filters.accountId) {
            groupQb.andWhere('contact.social_account_id = :accountId', { accountId: filters.accountId });
        }

        if (filters.platform) {
            groupQb.andWhere('contact.platform = :platform', { platform: filters.platform });
        }

        if (filters.dateFrom) {
            groupQb.andWhere('ci.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
        }
        if (filters.dateTo) {
            groupQb.andWhere('ci.created_at <= :dateTo', { dateTo: filters.dateTo });
        }

        groupQb
            .groupBy('postKey')
            .orderBy('"latestComment"', 'DESC');

        // Get total groups for pagination
        const allGroups = await groupQb.getRawMany();
        const total = allGroups.length;
        const pagedGroups = allGroups.slice(skip, skip + limit);

        if (pagedGroups.length === 0) {
            return { groups: [], total, pages: Math.ceil(total / limit) };
        }

        // Step 2: Fetch comments for these post groups
        const postKeys = pagedGroups.map((g) => g.postKey);
        const hasNoPost = postKeys.includes('__no_post__');
        const realPostIds = postKeys.filter((k: string) => k !== '__no_post__');

        const commentsQb = this.interactionRepo
            .createQueryBuilder('ci')
            .innerJoinAndSelect('ci.contact', 'contact')
            .where('contact.user_id = :userId', { userId })
            .andWhere('ci.type = :type', { type: InteractionType.COMMENT });

        // Exclude comments from connected accounts
        if (connectedAccountIds.length > 0) {
            commentsQb.andWhere('contact.platform_user_id NOT IN (:...connectedAccountIds)', { connectedAccountIds });
        }

        // Apply the same filters to comments query
        if (filters.status === 'unreplied') {
            commentsQb.andWhere('ci.replied_at IS NULL');
        } else if (filters.status === 'replied') {
            commentsQb.andWhere('ci.replied_at IS NOT NULL');
        }

        if (filters.search) {
            commentsQb.andWhere(
                '(ci.content ILIKE :search OR contact.name ILIKE :search OR contact.username ILIKE :search)',
                { search: `%${filters.search}%` },
            );
        }

        if (filters.accountId) {
            commentsQb.andWhere('contact.social_account_id = :accountId', { accountId: filters.accountId });
        }

        if (filters.platform) {
            commentsQb.andWhere('contact.platform = :platform', { platform: filters.platform });
        }

        if (filters.dateFrom) {
            commentsQb.andWhere('ci.created_at >= :dateFrom', { dateFrom: filters.dateFrom });
        }
        if (filters.dateTo) {
            commentsQb.andWhere('ci.created_at <= :dateTo', { dateTo: filters.dateTo });
        }

        // Filter by post keys from current page
        if (hasNoPost && realPostIds.length > 0) {
            commentsQb.andWhere(
                '(ci.post_id IN (:...realPostIds) OR ci.post_id IS NULL)',
                { realPostIds },
            );
        } else if (hasNoPost) {
            commentsQb.andWhere('ci.post_id IS NULL');
        } else {
            commentsQb.andWhere('ci.post_id IN (:...realPostIds)', { realPostIds });
        }

        commentsQb.orderBy('ci.createdAt', 'DESC');
        const comments = await commentsQb.getMany();

        // Step 3: Batch-load posts
        const postMap = new Map<string, Post>();
        if (realPostIds.length > 0) {
            const posts = await this.postRepo
                .createQueryBuilder('post')
                .where('post.platform_post_id IN (:...postIds)', { postIds: realPostIds })
                .getMany();

            for (const post of posts) {
                postMap.set(post.platformPostId, post);
            }
        }

        // Step 4: Build grouped response
        const commentsByPost = new Map<string, typeof comments>();
        for (const ci of comments) {
            const key = ci.postId || '__no_post__';
            if (!commentsByPost.has(key)) {
                commentsByPost.set(key, []);
            }
            commentsByPost.get(key)!.push(ci);
        }

        const groups = pagedGroups.map((g) => {
            const key = g.postKey;
            const groupComments = commentsByPost.get(key) || [];
            const post = key !== '__no_post__' ? postMap.get(key) || null : null;

            return {
                postId: key !== '__no_post__' ? key : null,
                commentCount: g.commentCount,
                post: post
                    ? {
                          id: post.id,
                          content: post.content,
                          mediaUrl: post.mediaUrl,
                          thumbnailUrl: post.thumbnailUrl,
                          platformPostId: post.platformPostId,
                      }
                    : null,
                comments: groupComments.map((ci) => ({
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
                })),
            };
        });

        return {
            groups,
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
