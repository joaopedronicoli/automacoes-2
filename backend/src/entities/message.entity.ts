import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum MessageDirection {
    INCOMING = 'incoming',
    OUTGOING = 'outgoing',
}

export enum MessageStatus {
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed',
}

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    FILE = 'file',
    STICKER = 'sticker',
    STORY_MENTION = 'story_mention',
    STORY_REPLY = 'story_reply',
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'conversation_id' })
    @Index()
    conversationId: string;

    @ManyToOne(() => Conversation, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column({ name: 'external_id', nullable: true })
    @Index()
    externalId: string; // Instagram message ID (mid)

    @Column({
        type: 'varchar',
        length: 20,
        default: MessageDirection.INCOMING,
    })
    direction: MessageDirection;

    @Column({
        type: 'varchar',
        length: 20,
        default: MessageType.TEXT,
    })
    type: MessageType;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ name: 'media_url', nullable: true })
    mediaUrl: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: MessageStatus.SENT,
    })
    status: MessageStatus;

    @Column({ name: 'sender_id', nullable: true })
    senderId: string;

    @Column({ name: 'sender_name', nullable: true })
    senderName: string;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @Column({ name: 'instagram_timestamp', nullable: true })
    instagramTimestamp: Date;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;
}
