import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EvolutionApiService {
    private readonly logger = new Logger(EvolutionApiService.name);
    private readonly apiUrl = process.env.EVOLUTION_API_URL;
    private readonly apiKey = process.env.EVOLUTION_API_KEY;

    private api() {
        return axios.create({
            baseURL: this.apiUrl,
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.apiKey,
            },
        });
    }

    async createInstance(
        instanceName: string,
        chatwootAccountId: number,
        chatwootToken: string,
        chatwootUrl: string,
    ): Promise<any> {
        const res = await this.api().post('/instance/create', {
            instanceName,
            integration: 'CHATWOOT',
            chatwootAccountId,
            chatwootToken,
            chatwootUrl,
            chatwootSignMsg: true,
            chatwootReopenConversation: true,
            chatwootConversationPending: false,
            qrcode: true,
        });
        return res.data;
    }

    async getQrCode(instanceName: string): Promise<any> {
        const res = await this.api().get(`/instance/connect/${instanceName}`);
        return res.data;
    }

    async getConnectionState(instanceName: string): Promise<any> {
        const res = await this.api().get(`/instance/connectionState/${instanceName}`);
        return res.data;
    }

    async deleteInstance(instanceName: string): Promise<void> {
        await this.api().delete(`/instance/delete/${instanceName}`);
    }
}
