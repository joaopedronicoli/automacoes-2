import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('chatwoot_accounts')
export class ChatwootAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', unique: true })
    userId: string;

    @OneToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'chatwoot_account_id', type: 'int' })
    chatwootAccountId: number;

    @Column({ name: 'chatwoot_user_id', type: 'int' })
    chatwootUserId: number;

    @Column({ name: 'chatwoot_access_token', type: 'text' })
    chatwootAccessToken: string;

    @Column({ name: 'chatwoot_user_email' })
    chatwootUserEmail: string;

    @Column({ length: 20, default: 'active' })
    status: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
