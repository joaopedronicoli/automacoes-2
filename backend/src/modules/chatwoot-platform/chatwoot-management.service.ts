import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatwootAccount } from '../../entities/chatwoot-account.entity';
import { EvolutionInstance } from '../../entities/evolution-instance.entity';
import { User } from '../../entities/user.entity';
import { ChatwootPlatformService } from './chatwoot-platform.service';
import { EvolutionApiService } from './evolution-api.service';
import { PlansService } from '../plans/plans.service';
import { randomUUID } from 'crypto';

@Injectable()
export class ChatwootManagementService {
    private readonly logger = new Logger(ChatwootManagementService.name);

    constructor(
        @InjectRepository(ChatwootAccount)
        private chatwootAccountRepo: Repository<ChatwootAccount>,
        @InjectRepository(EvolutionInstance)
        private evolutionInstanceRepo: Repository<EvolutionInstance>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private chatwootPlatformService: ChatwootPlatformService,
        private evolutionApiService: EvolutionApiService,
        private plansService: PlansService,
    ) {}

    async setupChatwootAccount(userId: string): Promise<ChatwootAccount> {
        const existing = await this.chatwootAccountRepo.findOne({ where: { userId } });
        if (existing) {
            throw new BadRequestException('Chatwoot account already exists for this user');
        }

        const dbUser = await this.userRepo.findOne({ where: { id: userId } });
        const name = dbUser?.name || 'User';
        const password = randomUUID().replace(/-/g, '').slice(0, 16);
        const chatwootEmail = `jolu_${userId.slice(0, 8)}@jolu.ai`;

        const account = await this.chatwootPlatformService.createAccount(name);
        const user = await this.chatwootPlatformService.createUser(name, chatwootEmail, password);
        await this.chatwootPlatformService.linkUserToAccount(account.id, user.id, 'administrator');

        const entity = this.chatwootAccountRepo.create({
            userId,
            chatwootAccountId: account.id,
            chatwootUserId: user.id,
            chatwootAccessToken: user.access_token,
            chatwootUserEmail: chatwootEmail,
            status: 'active',
            metadata: { generatedPassword: password },
        });

        return this.chatwootAccountRepo.save(entity);
    }

    async getChatwootAccount(userId: string): Promise<ChatwootAccount | null> {
        return this.chatwootAccountRepo.findOne({ where: { userId } });
    }

    private async requireAccount(userId: string): Promise<ChatwootAccount> {
        const account = await this.getChatwootAccount(userId);
        if (!account) {
            throw new BadRequestException('Chatwoot account not configured. Call setup first.');
        }
        return account;
    }

    async getEffectiveLimits(userId: string) {
        return this.plansService.getEffectiveLimits(userId);
    }

    // --- Inboxes ---

    async getInboxes(userId: string): Promise<any[]> {
        const account = await this.requireAccount(userId);
        return this.chatwootPlatformService.getInboxes(account.chatwootAccessToken, account.chatwootAccountId);
    }

    async createInbox(userId: string, dto: { type: 'email' | 'api'; name: string; email?: string; webhookUrl?: string }): Promise<any> {
        const account = await this.requireAccount(userId);
        const limits = await this.getEffectiveLimits(userId);
        const inboxes = await this.getInboxes(userId);

        if (inboxes.length >= limits.maxChatwootInboxes) {
            throw new BadRequestException('Inbox limit reached. Upgrade your plan.');
        }

        if (dto.type === 'email') {
            return this.chatwootPlatformService.createEmailInbox(
                account.chatwootAccessToken, account.chatwootAccountId, dto.name, dto.email,
            );
        }
        return this.chatwootPlatformService.createApiInbox(
            account.chatwootAccessToken, account.chatwootAccountId, dto.name, dto.webhookUrl,
        );
    }

    async deleteInbox(userId: string, inboxId: number): Promise<void> {
        const account = await this.requireAccount(userId);
        await this.chatwootPlatformService.deleteInbox(account.chatwootAccessToken, account.chatwootAccountId, inboxId);
    }

    // --- WhatsApp (Evolution API) ---

    async createWhatsAppInstance(userId: string): Promise<{ instance: EvolutionInstance; qrCode: any }> {
        const account = await this.requireAccount(userId);
        const limits = await this.getEffectiveLimits(userId);
        const instances = await this.evolutionInstanceRepo.find({ where: { userId } });

        if (instances.length >= limits.maxWhatsappConnections) {
            throw new BadRequestException('WhatsApp connection limit reached. Upgrade your plan.');
        }

        const instanceName = `jolu_${userId.slice(0, 8)}_${Date.now()}`;
        const result = await this.evolutionApiService.createInstance(
            instanceName,
            account.chatwootAccountId,
            account.chatwootAccessToken,
            process.env.CHATWOOT_PLATFORM_URL,
        );

        const instance = this.evolutionInstanceRepo.create({
            userId,
            chatwootAccountId: account.id,
            instanceName,
            status: 'connecting',
            metadata: result,
        });

        const saved = await this.evolutionInstanceRepo.save(instance);
        return { instance: saved, qrCode: result };
    }

    async getWhatsAppQrCode(userId: string, instanceId: string): Promise<any> {
        const instance = await this.evolutionInstanceRepo.findOne({ where: { id: instanceId, userId } });
        if (!instance) throw new NotFoundException('Instance not found');
        return this.evolutionApiService.getQrCode(instance.instanceName);
    }

    async getWhatsAppConnectionState(userId: string, instanceId: string): Promise<any> {
        const instance = await this.evolutionInstanceRepo.findOne({ where: { id: instanceId, userId } });
        if (!instance) throw new NotFoundException('Instance not found');

        const state = await this.evolutionApiService.getConnectionState(instance.instanceName);
        const newStatus = state?.instance?.state === 'open' ? 'connected' : instance.status;

        if (newStatus !== instance.status) {
            instance.status = newStatus;
            await this.evolutionInstanceRepo.save(instance);
        }

        return { ...state, instanceId: instance.id, status: newStatus };
    }

    async getWhatsAppInstances(userId: string): Promise<EvolutionInstance[]> {
        return this.evolutionInstanceRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
    }

    async deleteWhatsAppInstance(userId: string, instanceId: string): Promise<void> {
        const instance = await this.evolutionInstanceRepo.findOne({ where: { id: instanceId, userId } });
        if (!instance) throw new NotFoundException('Instance not found');

        try {
            await this.evolutionApiService.deleteInstance(instance.instanceName);
        } catch (err) {
            this.logger.warn(`Failed to delete Evolution instance ${instance.instanceName}: ${err.message}`);
        }

        await this.evolutionInstanceRepo.remove(instance);
    }

    // --- Agents ---

    async getAgents(userId: string): Promise<any[]> {
        const account = await this.requireAccount(userId);
        return this.chatwootPlatformService.getAgents(account.chatwootAccessToken, account.chatwootAccountId);
    }

    async addAgent(userId: string, dto: { email: string; name: string }): Promise<any> {
        const account = await this.requireAccount(userId);
        const limits = await this.getEffectiveLimits(userId);
        const agents = await this.getAgents(userId);

        if (agents.length >= limits.maxChatwootAgents) {
            throw new BadRequestException('Agent limit reached. Upgrade your plan.');
        }

        return this.chatwootPlatformService.addAgent(
            account.chatwootAccessToken, account.chatwootAccountId, dto.email, dto.name,
        );
    }

    async removeAgent(userId: string, agentId: number): Promise<void> {
        const account = await this.requireAccount(userId);
        await this.chatwootPlatformService.removeAgent(account.chatwootAccessToken, account.chatwootAccountId, agentId);
    }

    // --- Account info with panel link ---

    async getAccountInfo(userId: string) {
        const account = await this.requireAccount(userId);
        const limits = await this.getEffectiveLimits(userId);

        let inboxCount = 0;
        let agentCount = 0;
        let whatsappCount = 0;

        try {
            const inboxes = await this.getInboxes(userId);
            inboxCount = inboxes.length;
        } catch {}

        try {
            const agents = await this.getAgents(userId);
            agentCount = agents.length;
        } catch {}

        try {
            const instances = await this.getWhatsAppInstances(userId);
            whatsappCount = instances.length;
        } catch {}

        return {
            id: account.id,
            chatwootAccountId: account.chatwootAccountId,
            chatwootUserEmail: account.chatwootUserEmail,
            status: account.status,
            panelUrl: `${process.env.CHATWOOT_PLATFORM_URL}/app/accounts/${account.chatwootAccountId}/dashboard`,
            usage: {
                inboxes: inboxCount,
                agents: agentCount,
                whatsapp: whatsappCount,
            },
            limits,
        };
    }
}
