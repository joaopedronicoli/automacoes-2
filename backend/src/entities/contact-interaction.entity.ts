import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Contact } from './contact.entity';

export enum InteractionType {
    COMMENT = 'comment',
    COMMENT_REPLY = 'comment_reply',
    DM_RECEIVED = 'dm_received',
    DM_SENT = 'dm_sent',
    MENTION = 'mention',
    STORY_REPLY = 'story_reply',
    STORY_MENTION = 'story_mention',
    AUTOMATION_TRIGGERED = 'automation_triggered',
}

@Entity('contact_interactions')
@Index(['contactId', 'createdAt'])
export class ContactInteraction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'contact_id' })
    contactId: string;

    @ManyToOne(() => Contact, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'contact_id' })
    contact: Contact;

    @Column({
        type: 'varchar',
    })
    type: InteractionType;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ name: 'post_id', nullable: true })
    postId: string;

    @Column({ name: 'conversation_id', nullable: true })
    conversationId: string;

    @Column({ name: 'external_id', nullable: true })
    externalId: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ name: 'score_awarded', default: 0 })
    scoreAwarded: number;

    @Column({ name: 'replied_at', type: 'timestamp', nullable: true })
    repliedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
