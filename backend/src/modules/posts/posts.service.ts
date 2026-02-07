import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { FacebookService } from '../platforms/facebook/facebook.service';
import { SocialAccountsService } from '../social-accounts/social-accounts.service';

@Injectable()
export class PostsService {
    private readonly logger = new Logger(PostsService.name);

    constructor(
        @InjectRepository(Post)
        private postsRepository: Repository<Post>,
        private facebookService: FacebookService,
        private socialAccountsService: SocialAccountsService,
    ) { }

    async create(postData: Partial<Post>): Promise<Post> {
        const post = this.postsRepository.create(postData);
        return this.postsRepository.save(post);
    }

    async findBySocialAccount(socialAccountId: string, limit = 20, page = 1): Promise<{ posts: Post[]; total: number; pages: number }> {
        const [posts, total] = await this.postsRepository.findAndCount({
            where: { socialAccountId },
            order: { publishedAt: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
            relations: ['socialAccount'],
        });
        return { posts, total, pages: Math.ceil(total / limit) };
    }

    async findByUser(userId: string, limit = 20, page = 1): Promise<{ posts: Post[]; total: number; pages: number }> {
        const [posts, total] = await this.postsRepository.findAndCount({
            where: { socialAccount: { userId } },
            order: { publishedAt: 'DESC' },
            take: limit,
            skip: (page - 1) * limit,
            relations: ['socialAccount'],
        });
        return { posts, total, pages: Math.ceil(total / limit) };
    }

    async findById(id: string): Promise<Post | null> {
        return this.postsRepository.findOne({ where: { id } });
    }

    async findByPlatformId(platformUserId: string, platformPostId: string): Promise<Post | null> {
        // Note: platformUserId (pageId) logic might require joining socialAccount to match accountId
        // For now assuming we can find it via socialAccount relations or just the post's platform ID + account check
        return this.postsRepository.findOne({
            where: {
                platformPostId,
                socialAccount: {
                    accountId: platformUserId
                }
            },
            relations: ['socialAccount'],
        });
    }

    async upsert(postData: Partial<Post>): Promise<Post> {
        const existing = await this.postsRepository.findOne({
            where: {
                socialAccountId: postData.socialAccountId,
                platformPostId: postData.platformPostId,
            },
        });

        if (existing) {
            await this.postsRepository.update(existing.id, postData);
            return this.findById(existing.id);
        }

        return this.create(postData);
    }

    /**
     * Get comments for a post
     */
    async getComments(postId: string): Promise<any[]> {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
            relations: ['socialAccount'],
        });

        if (!post) {
            throw new NotFoundException('Post não encontrado');
        }

        const account = await this.socialAccountsService.findById(post.socialAccountId);
        if (!account) {
            throw new NotFoundException('Conta social não encontrada');
        }

        const platform = post.socialAccount?.platform;

        if (platform === 'instagram') {
            return this.facebookService.getInstagramComments(
                post.platformPostId,
                account.accessToken,
            );
        } else if (platform === 'facebook') {
            return this.facebookService.getPostComments(
                post.platformPostId,
                account.accessToken,
            );
        }

        return [];
    }

    /**
     * Reply to a comment on a post
     */
    async replyToComment(postId: string, commentId: string, message: string): Promise<any> {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
            relations: ['socialAccount'],
        });

        if (!post) {
            throw new NotFoundException('Post não encontrado');
        }

        const account = await this.socialAccountsService.findById(post.socialAccountId);
        if (!account) {
            throw new NotFoundException('Conta social não encontrada');
        }

        const platform = post.socialAccount?.platform;

        if (platform === 'instagram') {
            return this.facebookService.replyToInstagramComment(
                commentId,
                message,
                account.accessToken,
            );
        } else if (platform === 'facebook') {
            return this.facebookService.replyToComment(
                commentId,
                message,
                account.accessToken,
            );
        }

        throw new Error('Plataforma não suportada');
    }

    /**
     * Send DM to a user who commented
     */
    async sendDmToCommenter(postId: string, userId: string, message: string): Promise<any> {
        const post = await this.postsRepository.findOne({
            where: { id: postId },
            relations: ['socialAccount'],
        });

        if (!post) {
            throw new NotFoundException('Post não encontrado');
        }

        const account = await this.socialAccountsService.findById(post.socialAccountId);
        if (!account) {
            throw new NotFoundException('Conta social não encontrada');
        }

        const platform = post.socialAccount?.platform;

        if (platform === 'instagram') {
            const linkedPageId = account.metadata?.linked_page_id;
            return this.facebookService.sendInstagramMessage(
                account.accountId,
                userId,
                message,
                account.accessToken,
                linkedPageId,
            );
        } else if (platform === 'facebook') {
            return this.facebookService.sendPrivateMessage(
                account.accountId,
                userId,
                message,
                account.accessToken,
            );
        }

        throw new Error('Plataforma não suportada');
    }
}
