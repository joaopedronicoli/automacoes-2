import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('plans')
export class Plan {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    name: string;

    @Column({ unique: true })
    slug: string;

    @Column({ nullable: true })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    price: number;

    @Column('simple-array')
    modules: string[];

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'sort_order', default: 0 })
    sortOrder: number;

    @Column({ name: 'stripe_price_id', nullable: true })
    stripePriceId: string;

    @Column({ name: 'max_chatwoot_inboxes', type: 'int', nullable: true, default: 3 })
    maxChatwootInboxes: number;

    @Column({ name: 'max_chatwoot_agents', type: 'int', nullable: true, default: 2 })
    maxChatwootAgents: number;

    @Column({ name: 'max_whatsapp_connections', type: 'int', nullable: true, default: 1 })
    maxWhatsappConnections: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
