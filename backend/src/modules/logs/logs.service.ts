import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AutomationLog } from '../../entities/automation-log.entity';

@Injectable()
export class LogsService {
    constructor(
        @InjectRepository(AutomationLog)
        private logsRepository: Repository<AutomationLog>,
    ) { }

    async create(logData: Partial<AutomationLog>): Promise<AutomationLog> {
        const log = this.logsRepository.create(logData);
        return this.logsRepository.save(log);
    }

    async findByAutomation(automationId: string, limit = 100, offset = 0): Promise<AutomationLog[]> {
        return this.logsRepository.find({
            where: { automationId },
            order: { executedAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }

    async findByDateRange(startDate: Date, endDate: Date, limit = 1000, offset = 0): Promise<AutomationLog[]> {
        return this.logsRepository.find({
            where: {
                executedAt: Between(startDate, endDate),
            },
            order: { executedAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
}
