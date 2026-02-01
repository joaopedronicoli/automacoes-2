import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Automation } from '../../entities/automation.entity';

@Injectable()
export class AutomationsService {
    constructor(
        @InjectRepository(Automation)
        private automationsRepository: Repository<Automation>,
    ) { }

    async create(automationData: Partial<Automation>): Promise<Automation> {
        const automation = this.automationsRepository.create(automationData);
        return this.automationsRepository.save(automation);
    }

    async findByUser(userId: string): Promise<Automation[]> {
        return this.automationsRepository.find({
            where: { userId },
            relations: ['post'],
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<Automation | null> {
        return this.automationsRepository.findOne({
            where: { id },
            relations: ['post'],
        });
    }

    async findByPostId(postId: string): Promise<Automation[]> {
        return this.automationsRepository.find({
            where: { postId },
            // also include account-level automations? (postId is null)
            // For MVP we stick to post-specific or explicit configuration
        });
    }

    async update(id: string, automationData: Partial<Automation>): Promise<Automation> {
        await this.automationsRepository.update(id, automationData);
        return this.findById(id);
    }

    async delete(id: string): Promise<void> {
        await this.automationsRepository.delete(id);
    }

    async toggleStatus(id: string): Promise<Automation> {
        const automation = await this.findById(id);
        const newStatus = automation.status === 'active' ? 'paused' : 'active';
        return this.update(id, { status: newStatus as any });
    }
}
