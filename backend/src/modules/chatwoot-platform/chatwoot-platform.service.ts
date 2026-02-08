import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatwootPlatformService {
    private readonly logger = new Logger(ChatwootPlatformService.name);
    private readonly platformUrl = process.env.CHATWOOT_PLATFORM_URL;
    private readonly platformToken = process.env.CHATWOOT_PLATFORM_TOKEN;

    private platformApi() {
        return axios.create({
            baseURL: this.platformUrl,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': this.platformToken,
            },
        });
    }

    private userApi(token: string) {
        return axios.create({
            baseURL: this.platformUrl,
            headers: {
                'Content-Type': 'application/json',
                'api_access_token': token,
            },
        });
    }

    // --- Platform API (admin token) ---

    async createAccount(name: string): Promise<{ id: number }> {
        const res = await this.platformApi().post('/platform/api/v1/accounts', { name });
        return res.data;
    }

    async createUser(name: string, email: string, password: string): Promise<{ id: number; access_token: string }> {
        const res = await this.platformApi().post('/platform/api/v1/users', {
            name,
            email,
            password,
            confirm_password: password,
        });
        return res.data;
    }

    async linkUserToAccount(accountId: number, userId: number, role: string = 'administrator'): Promise<void> {
        await this.platformApi().post('/platform/api/v1/account_users', {
            account_id: accountId,
            user_id: userId,
            role,
        });
    }

    // --- Account API (user token) ---

    async getInboxes(token: string, accountId: number): Promise<any[]> {
        const res = await this.userApi(token).get(`/api/v1/accounts/${accountId}/inboxes`);
        return res.data?.payload || res.data || [];
    }

    async createEmailInbox(token: string, accountId: number, name: string, email: string): Promise<any> {
        const res = await this.userApi(token).post(`/api/v1/accounts/${accountId}/inboxes`, {
            name,
            channel: {
                type: 'email',
                email,
            },
        });
        return res.data;
    }

    async createApiInbox(token: string, accountId: number, name: string, webhookUrl?: string): Promise<any> {
        const res = await this.userApi(token).post(`/api/v1/accounts/${accountId}/inboxes`, {
            name,
            channel: {
                type: 'api',
                webhook_url: webhookUrl || '',
            },
        });
        return res.data;
    }

    async deleteInbox(token: string, accountId: number, inboxId: number): Promise<void> {
        await this.userApi(token).delete(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`);
    }

    async getAgents(token: string, accountId: number): Promise<any[]> {
        const res = await this.userApi(token).get(`/api/v1/accounts/${accountId}/agents`);
        return res.data || [];
    }

    async addAgent(token: string, accountId: number, email: string, name: string): Promise<any> {
        const res = await this.userApi(token).post(`/api/v1/accounts/${accountId}/agents`, {
            email,
            name,
            role: 'agent',
        });
        return res.data;
    }

    async removeAgent(token: string, accountId: number, agentId: number): Promise<void> {
        await this.userApi(token).delete(`/api/v1/accounts/${accountId}/agents/${agentId}`);
    }
}
