import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Integration, IntegrationType, IntegrationStatus } from '../../entities/integration.entity';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import axios from 'axios';

export interface WooCommerceProduct {
    id: number;
    name: string;
    price: string;
    regular_price: string;
    sale_price: string;
    description: string;
    short_description: string;
    permalink: string;
    images: Array<{ src: string; alt: string }>;
    categories: Array<{ id: number; name: string }>;
    stock_status: string;
    stock_quantity: number | null;
}

interface CreateWooCommerceDto {
    name: string;
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
}

interface CreateChatwootDto {
    name: string;
    chatwootUrl: string;
    accessToken: string;
    inboxId: number;
    accountId: number;
    instagramInboxId?: number;
    instagramAccountId?: string;
}

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    constructor(
        @InjectRepository(Integration)
        private integrationRepository: Repository<Integration>,
        private chatwootService: ChatwootService,
    ) {}

    async findByUser(userId: string): Promise<Integration[]> {
        return this.integrationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<Integration | null> {
        return this.integrationRepository.findOne({ where: { id } });
    }

    async findActiveWooCommerce(userId: string): Promise<Integration | null> {
        return this.integrationRepository.findOne({
            where: {
                userId,
                type: IntegrationType.WOOCOMMERCE,
                status: IntegrationStatus.ACTIVE,
            },
        });
    }

    async testWooCommerceConnection(storeUrl: string, consumerKey: string, consumerSecret: string): Promise<{ success: boolean; productCount: number; message?: string }> {
        try {
            const apiUrl = `${storeUrl}/wp-json/wc/v3/products`;

            const response = await axios.get(apiUrl, {
                auth: {
                    username: consumerKey,
                    password: consumerSecret,
                },
                params: {
                    per_page: 1,
                },
                timeout: 10000,
            });

            // Get total count from headers
            const totalProducts = parseInt(response.headers['x-wp-total'] || '0', 10);

            return {
                success: true,
                productCount: totalProducts,
            };
        } catch (error) {
            this.logger.error(`WooCommerce connection test failed: ${error.message}`);

            if (error.response?.status === 401) {
                throw new BadRequestException('Credenciais invalidas. Verifique a Consumer Key e Consumer Secret.');
            }

            if (error.response?.status === 404) {
                throw new BadRequestException('API WooCommerce nao encontrada. Verifique se o WooCommerce esta instalado e a URL esta correta.');
            }

            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new BadRequestException('Nao foi possivel conectar a loja. Verifique a URL.');
            }

            throw new BadRequestException(`Erro ao conectar: ${error.message}`);
        }
    }

    async createWooCommerce(userId: string, dto: CreateWooCommerceDto): Promise<Integration> {
        // Test connection first
        await this.testWooCommerceConnection(dto.storeUrl, dto.consumerKey, dto.consumerSecret);

        // Check if user already has a WooCommerce integration
        const existing = await this.findActiveWooCommerce(userId);
        if (existing) {
            // Update existing
            existing.name = dto.name;
            existing.storeUrl = dto.storeUrl;
            existing.consumerKey = dto.consumerKey;
            existing.consumerSecret = dto.consumerSecret;
            existing.status = IntegrationStatus.ACTIVE;
            return this.integrationRepository.save(existing);
        }

        // Create new
        const integration = this.integrationRepository.create({
            userId,
            type: IntegrationType.WOOCOMMERCE,
            name: dto.name,
            storeUrl: dto.storeUrl,
            consumerKey: dto.consumerKey,
            consumerSecret: dto.consumerSecret,
            status: IntegrationStatus.ACTIVE,
        });

        return this.integrationRepository.save(integration);
    }

    async delete(id: string, userId: string): Promise<void> {
        const integration = await this.integrationRepository.findOne({
            where: { id, userId },
        });

        if (!integration) {
            throw new NotFoundException('Integracao nao encontrada');
        }

        await this.integrationRepository.remove(integration);
    }

    async getWooCommerceProducts(userId: string, search?: string, limit = 100): Promise<WooCommerceProduct[]> {
        const integration = await this.findActiveWooCommerce(userId);

        if (!integration) {
            throw new BadRequestException('Nenhuma integracao WooCommerce ativa encontrada');
        }

        try {
            const apiUrl = `${integration.storeUrl}/wp-json/wc/v3/products`;

            const params: Record<string, any> = {
                per_page: limit,
                status: 'publish',
            };

            if (search) {
                params.search = search;
            }

            const response = await axios.get<WooCommerceProduct[]>(apiUrl, {
                auth: {
                    username: integration.consumerKey,
                    password: integration.consumerSecret,
                },
                params,
                timeout: 15000,
            });

            const products = response.data.map((product) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                regular_price: product.regular_price,
                sale_price: product.sale_price,
                description: product.description,
                short_description: product.short_description,
                permalink: product.permalink,
                images: product.images,
                categories: product.categories,
                stock_status: product.stock_status,
                stock_quantity: product.stock_quantity,
            }));

            const searchLower = search?.toLowerCase() || '';

            return products.sort((a, b) => {
                if (searchLower) {
                    const aName = a.name?.toLowerCase() || '';
                    const bName = b.name?.toLowerCase() || '';
                    const aExact = aName === searchLower;
                    const bExact = bName === searchLower;
                    const aStarts = aName.startsWith(searchLower);
                    const bStarts = bName.startsWith(searchLower);

                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;
                    if (aStarts && !bStarts) return -1;
                    if (!aStarts && bStarts) return 1;
                }
                return (a.name || '').localeCompare(b.name || '', 'pt-BR');
            });
        } catch (error) {
            this.logger.error(`Failed to fetch WooCommerce products: ${error.message}`);

            if (error.response?.status === 401) {
                // Mark integration as error
                await this.integrationRepository.update(integration.id, {
                    status: IntegrationStatus.ERROR,
                });
                throw new BadRequestException('Credenciais invalidas. Reconecte sua loja WooCommerce.');
            }

            throw new BadRequestException(`Erro ao buscar produtos: ${error.message}`);
        }
    }

    async getWooCommerceProductById(userId: string, productId: number): Promise<WooCommerceProduct | null> {
        const integration = await this.findActiveWooCommerce(userId);

        if (!integration) {
            throw new BadRequestException('Nenhuma integracao WooCommerce ativa encontrada');
        }

        try {
            const apiUrl = `${integration.storeUrl}/wp-json/wc/v3/products/${productId}`;

            const response = await axios.get<WooCommerceProduct>(apiUrl, {
                auth: {
                    username: integration.consumerKey,
                    password: integration.consumerSecret,
                },
                timeout: 10000,
            });

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch WooCommerce product ${productId}: ${error.message}`);
            return null;
        }
    }

    async findActiveChatwoot(userId: string): Promise<Integration | null> {
        return this.integrationRepository.findOne({
            where: {
                userId,
                type: IntegrationType.CHATWOOT,
                status: IntegrationStatus.ACTIVE,
            },
        });
    }

    /**
     * Find active Chatwoot integration by Instagram inbox ID in metadata
     */
    async findChatwootByInstagramInboxId(inboxId: number): Promise<Integration | null> {
        const integrations = await this.integrationRepository.find({
            where: {
                type: IntegrationType.CHATWOOT,
                status: IntegrationStatus.ACTIVE,
            },
        });

        return integrations.find(
            (i) => i.metadata?.instagramInboxId === inboxId || i.metadata?.inboxId === inboxId,
        ) || null;
    }

    /**
     * Find active Chatwoot integration by Instagram account ID in metadata
     */
    async findChatwootByInstagramAccountId(instagramAccountId: string): Promise<Integration | null> {
        const integrations = await this.integrationRepository.find({
            where: {
                type: IntegrationType.CHATWOOT,
                status: IntegrationStatus.ACTIVE,
            },
        });

        return integrations.find(
            (i) => i.metadata?.instagramAccountId === instagramAccountId,
        ) || null;
    }

    async testChatwootConnection(chatwootUrl: string, accessToken: string): Promise<{ success: boolean; message?: string }> {
        try {
            const isValid = await this.chatwootService.testConnection(chatwootUrl, accessToken);

            if (!isValid) {
                throw new BadRequestException('Falha ao conectar com Chatwoot. Verifique a URL e o token de acesso.');
            }

            return {
                success: true,
            };
        } catch (error) {
            this.logger.error(`Chatwoot connection test failed: ${error.message}`);

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException(`Erro ao conectar: ${error.message}`);
        }
    }

    async createChatwoot(userId: string, dto: CreateChatwootDto): Promise<Integration> {
        // Test connection first
        await this.testChatwootConnection(dto.chatwootUrl, dto.accessToken);

        const metadata: Record<string, any> = {
            inboxId: dto.inboxId,
            accountId: dto.accountId,
        };

        if (dto.instagramInboxId) {
            metadata.instagramInboxId = dto.instagramInboxId;
        }

        if (dto.instagramAccountId) {
            metadata.instagramAccountId = dto.instagramAccountId;
        }

        // Check if user already has a Chatwoot integration
        const existing = await this.findActiveChatwoot(userId);
        if (existing) {
            // Update existing
            existing.name = dto.name;
            existing.storeUrl = dto.chatwootUrl;
            existing.consumerKey = dto.accessToken;
            existing.metadata = metadata;
            existing.status = IntegrationStatus.ACTIVE;
            return this.integrationRepository.save(existing);
        }

        // Create new
        const integration = this.integrationRepository.create({
            userId,
            type: IntegrationType.CHATWOOT,
            name: dto.name,
            storeUrl: dto.chatwootUrl,
            consumerKey: dto.accessToken,
            metadata,
            status: IntegrationStatus.ACTIVE,
        });

        return this.integrationRepository.save(integration);
    }
}
