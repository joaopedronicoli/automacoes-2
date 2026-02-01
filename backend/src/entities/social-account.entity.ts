import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Post } from './post.entity';

export enum SocialPlatform {
    FACEBOOK = 'facebook',
    INSTAGRAM = 'instagram',
    YOUTUBE = 'youtube',
    TIKTOK = 'tiktok',
}

export enum AccountStatus {
    ACTIVE = 'active',
    EXPIRED = 'expired',
    ERROR = 'error',
    DISCONNECTED = 'disconnected',
}

@Entity('social_accounts')
export class SocialAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, (user) => user.socialAccounts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'varchar',
        length: 20,
    })
    platform: SocialPlatform;

    @Column({ name: 'account_id' })
    accountId: string;

    @Column({ name: 'account_name', nullable: true })
    accountName: string;

    @Column({ name: 'account_username', nullable: true })
    accountUsername: string;

    @Column({ name: 'profile_picture_url', type: 'text', nullable: true })
    profilePictureUrl: string;

    @Column({ name: 'access_token', type: 'text' })
    accessToken: string;

    @Column({ name: 'refresh_token', type: 'text', nullable: true })
    refreshToken: string;

    @Column({ name: 'token_expires_at', type: 'timestamp', nullable: true })
    tokenExpiresAt: Date;

    @Column({
        type: 'varchar',
        length: 20,
        default: AccountStatus.ACTIVE,
    })
    status: AccountStatus;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @OneToMany(() => Post, (post) => post.socialAccount)
    posts: Post[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
