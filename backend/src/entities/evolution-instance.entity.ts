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
import { ChatwootAccount } from './chatwoot-account.entity';

@Entity('evolution_instances')
export class EvolutionInstance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'chatwoot_account_id' })
    chatwootAccountId: string;

    @ManyToOne(() => ChatwootAccount, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chatwoot_account_id' })
    chatwootAccount: ChatwootAccount;

    @Column({ name: 'instance_name', unique: true })
    instanceName: string;

    @Column({ name: 'phone_number', nullable: true })
    phoneNumber: string;

    @Column({ length: 20, default: 'created' })
    status: string;

    @Column({ name: 'chatwoot_inbox_id', type: 'int', nullable: true })
    chatwootInboxId: number;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
