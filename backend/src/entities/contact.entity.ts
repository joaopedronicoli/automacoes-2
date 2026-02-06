import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';
import { SocialAccount } from './social-account.entity';

export enum LifecycleStage {
    LEAD = 'lead',
    ENGAGED = 'engaged',
    CUSTOMER = 'customer',
    VIP = 'vip',
}

export enum HeatLevel {
    HOT = 'hot',
    WARM = 'warm',
    COLD = 'cold',
}

@Entity('contacts')
@Index(['userId', 'platformUserId', 'platform'], { unique: true })
export class Contact {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'social_account_id', nullable: true })
    socialAccountId: string;

    @ManyToOne(() => SocialAccount)
    @JoinColumn({ name: 'social_account_id' })
    socialAccount: SocialAccount;

    @Column()
    platform: string; // 'instagram' | 'facebook'

    @Column({ name: 'platform_user_id' })
    @Index()
    platformUserId: string;

    @Column({ nullable: true })
    username: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ name: 'follower_count', default: 0 })
    followerCount: number;

    @Column({ name: 'is_verified', default: false })
    isVerified: boolean;

    @Column({ name: 'lead_score', default: 0 })
    leadScore: number;

    @Column({
        name: 'heat_level',
        type: 'varchar',
        default: HeatLevel.COLD,
    })
    heatLevel: HeatLevel;

    @Column({
        name: 'lifecycle_stage',
        type: 'varchar',
        default: LifecycleStage.LEAD,
    })
    lifecycleStage: LifecycleStage;

    @Column({ name: 'total_interactions', default: 0 })
    totalInteractions: number;

    @Column({ name: 'total_comments', default: 0 })
    totalComments: number;

    @Column({ name: 'total_dms_received', default: 0 })
    totalDmsReceived: number;

    @Column({ name: 'total_dms_sent', default: 0 })
    totalDmsSent: number;

    @Column({ name: 'first_interaction_at', type: 'timestamp', nullable: true })
    firstInteractionAt: Date;

    @Column({ name: 'last_interaction_at', type: 'timestamp', nullable: true })
    lastInteractionAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column('text', { array: true, default: '{}' })
    tags: string[];

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
