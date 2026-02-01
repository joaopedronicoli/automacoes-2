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
import { AutomationLog } from './automation-log.entity';

export enum AutomationType {
    COMMENT_REPLY = 'comment_reply',
    COMMENT_DM = 'comment_dm',
    DM_ONLY = 'dm_only',
}

export enum AutomationStatus {
    ACTIVE = 'active',
    PAUSED = 'paused',
    ERROR = 'error',
}

export interface TriggerConfig {
    keywords?: string[];
    allComments?: boolean;
    firstTimeCommenter?: boolean;
    detectQuestions?: boolean;
    emojiTriggers?: string[];
    blacklistWords?: string[];
    whitelistUsers?: string[];
}

export interface ResponseConfig {
    commentReply?: {
        message: string;
        delay?: number;
        oncePerUser?: boolean;
    };
    directMessage?: {
        message: string;
        delay?: number;
        mediaUrl?: string;
        oncePerUser?: boolean;
    };
}

export interface AutomationSettings {
    workingHours?: {
        start: string; // HH:mm format
        end: string;
    };
    pauseAfterResponses?: number;
    hourlyLimit?: number;
    accountTypeFilter?: string[]; // verified, follower, etc
}

export interface AutomationStats {
    replies: number;
    dms: number;
    errors: number;
}

@Entity('automations')
export class Automation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, (user) => user.automations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'post_id', nullable: true })
    postId: string;

    @ManyToOne(() => Post, (post) => post.automations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'post_id' })
    post: Post;

    @Column()
    name: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    type: AutomationType;

    @Column({
        type: 'varchar',
        length: 20,
        default: AutomationStatus.ACTIVE,
    })
    status: AutomationStatus;

    @Column({ type: 'jsonb', default: {} })
    triggers: TriggerConfig;

    @Column({ name: 'response_config', type: 'jsonb', default: {} })
    responseConfig: ResponseConfig;

    @Column({ type: 'jsonb', default: {} })
    settings: AutomationSettings;

    @Column({
        type: 'jsonb',
        default: { replies: 0, dms: 0, errors: 0 },
    })
    stats: AutomationStats;

    @Column({ name: 'last_executed_at', type: 'timestamp', nullable: true })
    lastExecutedAt: Date;

    @OneToMany(() => AutomationLog, (log) => log.automation)
    logs: AutomationLog[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
