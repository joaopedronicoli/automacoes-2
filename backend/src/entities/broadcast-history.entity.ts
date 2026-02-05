import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('broadcast_history')
@Index(['userId', 'broadcastName', 'contactPhone'])
export class BroadcastHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'broadcast_name' })
    broadcastName: string;

    @Column({ name: 'contact_phone' })
    contactPhone: string;

    @Column({ name: 'sent_at', type: 'timestamp', default: () => 'NOW()' })
    sentAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
