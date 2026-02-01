import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { SocialAccount } from './social-account.entity';
import { Automation } from './automation.entity';

export enum PostType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    CAROUSEL = 'carousel',
    REEL = 'reel',
    STORY = 'story',
}

export enum PostStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    PUBLISHED = 'published',
    FAILED = 'failed',
}

@Entity('posts')
@Index(['socialAccountId', 'platformPostId'], { unique: true })
export class Post {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'social_account_id' })
    socialAccountId: string;

    @ManyToOne(() => SocialAccount, (account) => account.posts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'social_account_id' })
    socialAccount: SocialAccount;

    @Column({ name: 'platform_post_id' })
    platformPostId: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ name: 'media_type', nullable: true })
    mediaType: string;

    @Column({ name: 'media_url', type: 'text', nullable: true })
    mediaUrl: string;

    @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
    thumbnailUrl: string;

    @Column({ name: 'post_url', type: 'text', nullable: true })
    postUrl: string;

    @Column({ name: 'likes_count', default: 0 })
    likesCount: number;

    @Column({ name: 'comments_count', default: 0 })
    commentsCount: number;

    @Column({ name: 'shares_count', default: 0 })
    sharesCount: number;

    @Column({ name: 'published_at', type: 'timestamp', nullable: true })
    publishedAt: Date;

    @Column({ name: 'fetched_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    fetchedAt: Date;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @OneToMany(() => Automation, (automation) => automation.post)
    automations: Automation[];
}
