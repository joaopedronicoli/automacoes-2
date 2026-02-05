import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum BroadcastStatus {
    PENDING = 'pending',
    SCHEDULED = 'scheduled',
    PROCESSING = 'processing',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

export interface BroadcastContact {
    name: string;
    phone: string;
    status?: 'pending' | 'sent' | 'failed' | 'skipped';
    error?: string;
    messageId?: string;
    sentAt?: Date;
    retryAttempts?: number;
    chatwootContactId?: number;
    chatwootSyncStatus?: 'synced' | 'missing' | 'created' | 'error';
    chatwootError?: string;
    [key: string]: any; // Dynamic fields from CSV
}

@Entity('broadcasts')
export class Broadcast {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column()
    name: string;

    @Column({ name: 'waba_id' })
    wabaId: string;

    @Column({ name: 'phone_number_id' })
    phoneNumberId: string;

    @Column({ name: 'template_name' })
    templateName: string;

    @Column({ name: 'template_language' })
    templateLanguage: string;

    @Column({ name: 'template_components', type: 'jsonb', default: [] })
    templateComponents: any[];

    @Column({
        type: 'varchar',
        length: 20,
        default: BroadcastStatus.PENDING,
    })
    status: BroadcastStatus;

    @Column({ name: 'total_contacts', default: 0 })
    totalContacts: number;

    @Column({ name: 'sent_count', default: 0 })
    sentCount: number;

    @Column({ name: 'failed_count', default: 0 })
    failedCount: number;

    @Column({ type: 'jsonb', default: [] })
    contacts: BroadcastContact[];

    @Column({ name: 'error_message', nullable: true })
    errorMessage: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    // Scheduling fields
    @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
    scheduledAt: Date;

    @Column({ name: 'timezone', default: 'America/Sao_Paulo' })
    timezone: string;

    // Time window fields
    @Column({ name: 'time_window_start', nullable: true })
    timeWindowStart: string;  // "07:00"

    @Column({ name: 'time_window_end', nullable: true })
    timeWindowEnd: string;    // "21:00"

    // Resume tracking
    @Column({ name: 'current_index', default: 0 })
    currentIndex: number;

    // Deduplication
    @Column({ name: 'enable_deduplication', default: false })
    enableDeduplication: boolean;

    // Chatwoot integration
    @Column({ name: 'chatwoot_integration_id', nullable: true })
    chatwootIntegrationId: string;
}
