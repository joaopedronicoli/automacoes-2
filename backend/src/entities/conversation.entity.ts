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
import { Message } from './message.entity';

export enum ConversationStatus {
    OPEN = 'open',
    RESOLVED = 'resolved',
    PENDING = 'pending',
}

@Entity('conversations')
@Index(['userId', 'updatedAt'])
@Index(['participantId', 'socialAccountId'], { unique: true })
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'social_account_id' })
    @Index()
    socialAccountId: string;

    @ManyToOne(() => SocialAccount, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'social_account_id' })
    socialAccount: SocialAccount;

    @Column({ name: 'participant_id' })
    @Index()
    participantId: string; // Instagram user ID (IGSID)

    @Column({ name: 'participant_name', nullable: true })
    participantName: string;

    @Column({ name: 'participant_username', nullable: true })
    participantUsername: string;

    @Column({ name: 'participant_avatar', nullable: true })
    participantAvatar: string;

    @Column({ name: 'participant_followers', nullable: true })
    participantFollowers: number;

    @Column({ name: 'participant_verified', default: false })
    participantVerified: boolean;

    @Column({
        type: 'varchar',
        length: 20,
        default: ConversationStatus.OPEN,
    })
    @Index()
    status: ConversationStatus;

    @Column({ name: 'last_message', type: 'text', nullable: true })
    lastMessage: string;

    @Column({ name: 'last_message_at', nullable: true })
    lastMessageAt: Date;

    @Column({ name: 'unread_count', default: 0 })
    unreadCount: number;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @OneToMany(() => Message, (message) => message.conversation)
    messages: Message[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
