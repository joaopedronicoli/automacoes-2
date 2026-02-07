import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { SocialAccount } from './social-account.entity';
import { Automation } from './automation.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ name: 'password_hash', nullable: true })
    passwordHash: string;

    @Column({ nullable: true })
    name: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ default: 'user' })
    role: string;

    @Column({ name: 'otp_code', nullable: true })
    otpCode: string;

    @Column({ name: 'otp_expires', type: 'timestamp', nullable: true })
    otpExpires: Date;

    @Column({ name: 'reset_token', type: 'text', nullable: true })
    resetToken: string;

    @Column({ name: 'reset_token_expires', type: 'timestamp', nullable: true })
    resetTokenExpires: Date;

    @OneToMany(() => SocialAccount, (account) => account.user)
    socialAccounts: SocialAccount[];

    @OneToMany(() => Automation, (automation) => automation.user)
    automations: Automation[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
