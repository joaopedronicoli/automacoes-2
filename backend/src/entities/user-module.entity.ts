import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToOne,
    JoinColumn,
    ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Plan } from './plan.entity';

@Entity('user_modules')
export class UserModule {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', unique: true })
    userId: string;

    @OneToOne(() => User, (user) => user.userModule, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'plan_id', nullable: true })
    planId: string;

    @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'plan_id' })
    plan: Plan;

    @Column('simple-array', { name: 'extra_modules', nullable: true })
    extraModules: string[];

    @Column('simple-array', { name: 'disabled_modules', nullable: true })
    disabledModules: string[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
