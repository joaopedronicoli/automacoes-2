import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';

@Injectable()
export class PostsService {
    constructor(
        @InjectRepository(Post)
        private postsRepository: Repository<Post>,
    ) { }

    async create(postData: Partial<Post>): Promise<Post> {
        const post = this.postsRepository.create(postData);
        return this.postsRepository.save(post);
    }

    async findBySocialAccount(socialAccountId: string, limit = 50, offset = 0): Promise<Post[]> {
        return this.postsRepository.find({
            where: { socialAccountId },
            order: { publishedAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['socialAccount'],
        });
    }

    async findByUser(userId: string, limit = 50, offset = 0): Promise<Post[]> {
        return this.postsRepository.find({
            where: { socialAccount: { userId } },
            order: { publishedAt: 'DESC' },
            take: limit,
            skip: offset,
            relations: ['socialAccount'],
        });
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
}
