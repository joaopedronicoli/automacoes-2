import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Plan } from '../../entities/plan.entity';
import { UserModule } from '../../entities/user-module.entity';
import { ALL_SELLABLE_MODULES } from '../../entities/enums/app-module.enum';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { SetModulesDto } from './dto/set-modules.dto';

@Injectable()
export class PlansService implements OnModuleInit {
    private readonly logger = new Logger(PlansService.name);

    constructor(
        @InjectRepository(Plan)
        private planRepo: Repository<Plan>,
        @InjectRepository(UserModule)
        private userModuleRepo: Repository<UserModule>,
    ) {}

    async onModuleInit() {
        try {
            await this.seedDefaultPlans();
        } catch (err) {
            this.logger.warn('Could not seed plans (table may not exist yet). Run with DATABASE_SYNCHRONIZE=true or create tables manually.');
        }
    }

    private async seedDefaultPlans() {
        const count = await this.planRepo.count();
        if (count > 0) return;

        const defaultPlans: Partial<Plan>[] = [
            {
                name: 'Pro',
                slug: 'pro',
                description: 'Plano profissional com automações e broadcast',
                price: 99,
                modules: ['inbox', 'contacts', 'posts', 'comments', 'automations', 'broadcast'],
                isActive: true,
                sortOrder: 1,
            },
            {
                name: 'Enterprise',
                slug: 'enterprise',
                description: 'Plano completo com todos os módulos incluindo Jolu AI',
                price: 199,
                modules: ALL_SELLABLE_MODULES as string[],
                isActive: true,
                sortOrder: 2,
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

    async getEffectiveLimits(userId: string): Promise<{
        maxChatwootInboxes: number;
        maxChatwootAgents: number;
        maxWhatsappConnections: number;
    }> {
        const um = await this.userModuleRepo.findOne({
            where: { userId },
            relations: ['plan'],
        });
        return {
            maxChatwootInboxes: um?.maxChatwootInboxesOverride ?? um?.plan?.maxChatwootInboxes ?? 3,
            maxChatwootAgents: um?.maxChatwootAgentsOverride ?? um?.plan?.maxChatwootAgents ?? 2,
            maxWhatsappConnections: um?.maxWhatsappConnectionsOverride ?? um?.plan?.maxWhatsappConnections ?? 1,
        };
    }

    async getSubscriptionReport() {
        const allSubs = await this.userModuleRepo.find({
            relations: ['plan', 'user'],
            where: {},
        });

        const withPlan = allSubs.filter((s) => s.planId);
        const active = withPlan.filter((s) => s.stripeStatus === 'active');
        const mrr = active.reduce((sum, s) => sum + Number(s.plan?.price || 0), 0);
        const totalSubscribers = active.length;
        const averageTicket = totalSubscribers > 0 ? mrr / totalSubscribers : 0;

        // Churn: canceled in last 30 days / (active + canceled in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentCanceled = withPlan.filter(
            (s) => s.stripeStatus === 'canceled' && s.updatedAt >= thirtyDaysAgo,
        );
        const churnBase = totalSubscribers + recentCanceled.length;
        const churnRate = churnBase > 0 ? (recentCanceled.length / churnBase) * 100 : 0;

        // Plan distribution
        const planMap = new Map<string, { planName: string; count: number; revenue: number }>();
        for (const s of withPlan) {
            const name = s.plan?.name || 'Unknown';
            const entry = planMap.get(name) || { planName: name, count: 0, revenue: 0 };
            entry.count++;
            if (s.stripeStatus === 'active') {
                entry.revenue += Number(s.plan?.price || 0);
            }
            planMap.set(name, entry);
        }
        const planDistribution = Array.from(planMap.values());

        // Status distribution
        const statusMap = new Map<string, number>();
        for (const s of withPlan) {
            const status = s.stripeStatus || 'none';
            statusMap.set(status, (statusMap.get(status) || 0) + 1);
        }
        const statusDistribution = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

        // Monthly trend (last 6 months)
        const monthlyMap = new Map<string, { revenue: number; subscribers: number }>();
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap.set(key, { revenue: 0, subscribers: 0 });
        }
        for (const s of withPlan) {
            const d = s.createdAt;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthlyMap.has(key)) {
                const entry = monthlyMap.get(key)!;
                entry.subscribers++;
                entry.revenue += Number(s.plan?.price || 0);
            }
        }
        const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, data]) => ({
            month,
            ...data,
        }));

        // Subscriptions table
        const subscriptions = withPlan.map((s) => ({
            userId: s.userId,
            userName: s.user?.name || '',
            userEmail: s.user?.email || '',
            planName: s.plan?.name || '',
            planPrice: Number(s.plan?.price || 0),
            stripeStatus: s.stripeStatus || 'none',
            stripeSubscriptionId: s.stripeSubscriptionId || null,
            subscribedAt: s.createdAt,
            updatedAt: s.updatedAt,
        }));

        return {
            totalSubscribers,
            mrr: Number(mrr.toFixed(2)),
            averageTicket: Number(averageTicket.toFixed(2)),
            churnRate: Number(churnRate.toFixed(1)),
            planDistribution,
            statusDistribution,
            monthlyTrend,
            subscriptions,
        };
    }
}
