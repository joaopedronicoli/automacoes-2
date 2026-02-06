import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Automation } from './automation.entity';

export enum LogActionType {
    COMMENT_REPLY = 'comment_reply',
    DM_SENT = 'dm_sent',
    SKIPPED = 'skipped',
    ERROR = 'error',
    INSTAGRAM_DM_RECEIVED = 'instagram_dm_received',
    INSTAGRAM_DM_FORWARDED = 'instagram_dm_forwarded',
    CHATWOOT_MESSAGE_SENT = 'chatwoot_message_sent',
}

export enum LogStatus {
    SUCCESS = 'success',
    ERROR = 'error',
}

@Entity('automation_logs')
@Index(['automationId', 'executedAt'])
@Index(['userId', 'executedAt'])
export class AutomationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    @Index()
    userId: string;

    @Column({ name: 'automation_id', nullable: true })
    automationId: string;

    @ManyToOne(() => Automation, (automation) => automation.logs, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'automation_id' })
    automation: Automation;

    @Column({ name: 'user_platform_id', nullable: true })
    userPlatformId: string;

    @Column({ name: 'user_name', nullable: true })
    userName: string;

    @Column({ name: 'user_username', nullable: true })
    userUsername: string;

    @Column({
        name: 'action_type',
        type: 'varchar',
        length: 50,
    })
    actionType: LogActionType;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({
        type: 'varchar',
        length: 20,
    })
    @Index()
    status: LogStatus;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'executed_at' })
    @Index()
    executedAt: Date;
}
