import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '../../entities/plan.entity';
import { UserModule } from '../../entities/user-module.entity';
import { ALL_SELLABLE_MODULES } from '../../entities/enums/app-module.enum';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SetModulesDto } from './dto/set-modules.dto';

@Injectable()
export class PlansService implements OnModuleInit {
    constructor(
        @InjectRepository(Plan)
        private planRepo: Repository<Plan>,
        @InjectRepository(UserModule)
        private userModuleRepo: Repository<UserModule>,
    ) {}

    async onModuleInit() {
        await this.seedDefaultPlans();
    }

    private async seedDefaultPlans() {
        const count = await this.planRepo.count();
        if (count > 0) return;

        const defaultPlans: Partial<Plan>[] = [
            {
                name: 'Básico',
                slug: 'basico',
                description: 'Plano básico com inbox e contatos',
                price: 0,
                modules: ['inbox', 'contacts'],
                isActive: true,
                sortOrder: 1,
            },
            {
                name: 'Pro',
                slug: 'pro',
                description: 'Plano profissional com automações e broadcast',
                price: 99,
                modules: ['inbox', 'contacts', 'posts', 'comments', 'automations', 'broadcast'],
                isActive: true,
                sortOrder: 2,
            },
            {
                name: 'Enterprise',
                slug: 'enterprise',
                description: 'Plano completo com todos os módulos incluindo Jolu AI',
                price: 199,
                modules: ALL_SELLABLE_MODULES as string[],
                isActive: true,
                sortOrder: 3,
            },
        ];

        for (const plan of defaultPlans) {
            await this.planRepo.save(this.planRepo.create(plan));
        }
    }

    async findAllPlans(): Promise<Plan[]> {
        return this.planRepo.find({ order: { sortOrder: 'ASC' } });
    }

    async createPlan(dto: CreatePlanDto): Promise<Plan> {
        const plan = this.planRepo.create(dto);
        return this.planRepo.save(plan);
    }

    async updatePlan(id: string, dto: UpdatePlanDto): Promise<Plan> {
        const plan = await this.planRepo.findOne({ where: { id } });
        if (!plan) throw new NotFoundException('Plano não encontrado');
        Object.assign(plan, dto);
        return this.planRepo.save(plan);
    }

    async deletePlan(id: string): Promise<void> {
        const plan = await this.planRepo.findOne({ where: { id } });
        if (!plan) throw new NotFoundException('Plano não encontrado');
        await this.planRepo.remove(plan);
    }

    async getActiveModules(userId: string): Promise<string[]> {
        const um = await this.userModuleRepo.findOne({
            where: { userId },
            relations: ['plan'],
        });

        if (!um) return [];

        const planModules = um.plan?.modules || [];
        const extra = um.extraModules || [];
        const disabled = um.disabledModules || [];

        const allModules = [...new Set([...planModules, ...extra])];
        return allModules.filter((m) => !disabled.includes(m));
    }

    async hasModule(userId: string, moduleKey: string): Promise<boolean> {
        const active = await this.getActiveModules(userId);
        return active.includes(moduleKey);
    }

    async getUserModules(userId: string): Promise<UserModule> {
        let um = await this.userModuleRepo.findOne({
            where: { userId },
            relations: ['plan'],
        });

        if (!um) {
            um = this.userModuleRepo.create({ userId });
            um = await this.userModuleRepo.save(um);
            um.plan = null;
        }

        return um;
    }

    async assignPlan(userId: string, planId: string | null): Promise<UserModule> {
        if (planId) {
            const plan = await this.planRepo.findOne({ where: { id: planId } });
            if (!plan) throw new NotFoundException('Plano não encontrado');
        }

        let um = await this.userModuleRepo.findOne({ where: { userId } });

        if (!um) {
            um = this.userModuleRepo.create({ userId, planId });
        } else {
            um.planId = planId;
        }

        await this.userModuleRepo.save(um);
        return this.getUserModules(userId);
    }

    async setExtraModules(userId: string, dto: SetModulesDto): Promise<UserModule> {
        let um = await this.userModuleRepo.findOne({ where: { userId } });

        if (!um) {
            um = this.userModuleRepo.create({ userId });
        }

        if (dto.extraModules !== undefined) {
            um.extraModules = dto.extraModules.length > 0 ? dto.extraModules : null;
        }
        if (dto.disabledModules !== undefined) {
            um.disabledModules = dto.disabledModules.length > 0 ? dto.disabledModules : null;
        }

        await this.userModuleRepo.save(um);
        return this.getUserModules(userId);
    }
}
