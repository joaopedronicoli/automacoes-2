import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
        private dataSource: DataSource,
    ) {}

    async findById(id: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { email } });
    }

    async findOrCreateByEmail(email: string, name?: string): Promise<User> {
        let user = await this.usersRepository.findOne({ where: { email } });

        if (!user) {
            user = this.usersRepository.create({
                email,
                name: name || null,
            });
            user = await this.usersRepository.save(user);
        } else if (name && !user.name) {
            user.name = name;
            user = await this.usersRepository.save(user);
        }

        return user;
    }

    async create(data: Partial<User>): Promise<User> {
        const user = this.usersRepository.create(data);
        return this.usersRepository.save(user);
    }

    async saveUser(user: User): Promise<User> {
        return this.usersRepository.save(user);
    }

    async findByPhone(phone: string): Promise<User | null> {
        return this.usersRepository.findOne({ where: { phone } });
    }

    async findAll(): Promise<User[]> {
        return this.usersRepository.find({
            order: { createdAt: 'DESC' },
            select: ['id', 'email', 'name', 'phone', 'role', 'createdAt'],
        });
    }

    async deleteUser(id: string): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            // Delete related records in correct order (children first)
            await manager.query('DELETE FROM automation_logs WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM broadcast_history WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM broadcasts WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM conversations WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM automations WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM contact_tags WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM contacts WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM integrations WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM social_accounts WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM user_modules WHERE user_id = $1', [id]);
            await manager.query('DELETE FROM users WHERE id = $1', [id]);
        });
    }
}
