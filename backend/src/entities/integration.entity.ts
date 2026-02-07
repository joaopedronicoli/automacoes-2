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

export enum IntegrationType {
    WOOCOMMERCE = 'woocommerce',
    SHOPIFY = 'shopify',
    WEBHOOK = 'webhook',
    CHATWOOT = 'chatwoot',
    GOOGLE_SHEETS = 'google_sheets',
    OPENAI = 'openai',
}

export enum IntegrationStatus {
    ACTIVE = 'active',
    ERROR = 'error',
    DISCONNECTED = 'disconnected',
}

@Entity('integrations')
export class Integration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'varchar',
        length: 50,
    })
    type: IntegrationType;

    @Column()
    name: string;

    @Column({ name: 'store_url', nullable: true })
    storeUrl: string;

    @Column({ name: 'consumer_key', type: 'text', nullable: true })
    consumerKey: string;

    @Column({ name: 'consumer_secret', type: 'text', nullable: true })
    consumerSecret: string;

    @Column({ name: 'webhook_url', type: 'text', nullable: true })
    webhookUrl: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: IntegrationStatus.ACTIVE,
    })
    status: IntegrationStatus;

    @Column({ type: 'jsonb', default: {} })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
