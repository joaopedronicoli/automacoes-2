import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount } from '../../entities/social-account.entity';
import { EncryptionService } from '../../common/utils/encryption.service';

@Injectable()
export class SocialAccountsService {
    private readonly logger = new Logger(SocialAccountsService.name);

    constructor(
        @InjectRepository(SocialAccount)
        private socialAccountsRepository: Repository<SocialAccount>,
        private encryptionService: EncryptionService,
    ) { }

    async create(accountData: Partial<SocialAccount>): Promise<SocialAccount> {
        // Encrypt tokens before saving
        if (accountData.accessToken) {
            accountData.accessToken = this.encryptionService.encrypt(accountData.accessToken);
        }
        if (accountData.refreshToken) {
            accountData.refreshToken = this.encryptionService.encrypt(accountData.refreshToken);
        }
        // Encrypt userAccessToken in metadata if present
        if (accountData.metadata?.userAccessToken) {
            accountData.metadata = {
                ...accountData.metadata,
                userAccessToken: this.encryptionService.encrypt(accountData.metadata.userAccessToken),
            };
        }

        const account = this.socialAccountsRepository.create(accountData);
        return this.socialAccountsRepository.save(account);
    }

    async findByUser(userId: string): Promise<SocialAccount[]> {
        const accounts = await this.socialAccountsRepository.find({ where: { userId } });
        // Note: We might want to decrypt tokens here strictly when needed? 
        // Usually controller doesn't need tokens, but internal services do.
        // For safety, let's keep tokens encrypted in findByUser and decrypt only in findByIdWithPath or explicit method.
        return accounts;
    }

    async findById(id: string): Promise<SocialAccount | null> {
        const account = await this.socialAccountsRepository.findOne({ where: { id } });

        if (account) {
            // Decrypt tokens when retrieving
            account.accessToken = this.encryptionService.decrypt(account.accessToken);
            if (account.refreshToken) {
                account.refreshToken = this.encryptionService.decrypt(account.refreshToken);
            }
        }

        return account;
    }

    async findByPlatformAndId(platform: string, accountId: string): Promise<SocialAccount | null> {
        const account = await this.socialAccountsRepository.findOne({
            where: {
                platform: platform as any,
                accountId
            }
        });

        if (account) {
            account.accessToken = this.encryptionService.decrypt(account.accessToken);
            if (account.refreshToken) {
                account.refreshToken = this.encryptionService.decrypt(account.refreshToken);
            }
        }
        return account;
    }

    async findAllActive(): Promise<SocialAccount[]> {
        const accounts = await this.socialAccountsRepository.find({
            where: { status: 'active' as any }
        });

        // Decrypt tokens for service usage
        return accounts.map(account => {
            account.accessToken = this.encryptionService.decrypt(account.accessToken);
            if (account.refreshToken) {
                account.refreshToken = this.encryptionService.decrypt(account.refreshToken);
            }
            return account;
        });
    }

    async delete(id: string): Promise<void> {
        await this.socialAccountsRepository.delete(id);
    }

    async updateTokens(id: string, accessToken: string, refreshToken?: string, expiresAt?: Date): Promise<void> {
        // Check if account has manualToken flag - don't overwrite manual tokens from OAuth
        const account = await this.socialAccountsRepository.findOne({ where: { id } });
        if (account?.metadata?.manualToken) {
            this.logger.log(`Skipping token update for account ${id} (${account.accountName}) - has manualToken flag`);
            return;
        }

        await this.socialAccountsRepository.update(id, {
            accessToken: this.encryptionService.encrypt(accessToken),
            refreshToken: refreshToken ? this.encryptionService.encrypt(refreshToken) : undefined,
            tokenExpiresAt: expiresAt,
        });
    }

    async updateToken(id: string, userId: string, accessToken: string): Promise<void> {
        this.logger.log(`Updating token for account ${id}, userId: ${userId}, token length: ${accessToken?.length}`);

        const account = await this.socialAccountsRepository.findOne({ where: { id } });

        if (!account) {
            this.logger.error(`Account ${id} not found`);
            throw new NotFoundException('Conta nao encontrada');
        }

        if (account.userId !== userId) {
            this.logger.error(`User ${userId} does not own account ${id} (owner: ${account.userId})`);
            throw new ForbiddenException('Voce nao tem permissao para editar esta conta');
        }

        const encryptedToken = this.encryptionService.encrypt(accessToken);
        this.logger.log(`Encrypted token preview: ${encryptedToken.substring(0, 30)}...`);

        // Set manualToken flag to prevent OAuth from overwriting
        const updatedMetadata: Record<string, any> = {
            ...account.metadata,
            manualToken: true,
        };

        await this.socialAccountsRepository.update(id, {
            accessToken: encryptedToken,
            metadata: updatedMetadata as any,
        });

        this.logger.log(`Token updated successfully for account ${id} (${account.accountName}) with manualToken flag`);
    }

    async updateMetadata(id: string, metadata: Record<string, any>): Promise<void> {
        // Encrypt userAccessToken if present in metadata
        if (metadata.userAccessToken) {
            metadata.userAccessToken = this.encryptionService.encrypt(metadata.userAccessToken);
        }
        await this.socialAccountsRepository.update(id, { metadata });
    }

    async getDecryptedMetadata(account: SocialAccount): Promise<Record<string, any>> {
        const metadata = { ...account.metadata };
        if (metadata?.userAccessToken) {
            metadata.userAccessToken = this.encryptionService.decrypt(metadata.userAccessToken);
        }
        return metadata;
    }

    async findOrCreate(data: {
        userId: string;
        platform: string;
        platformUserId: string;
        accountName: string;
        accessToken: string;
        refreshToken?: string;
        tokenExpiresAt?: Date;
    }): Promise<SocialAccount> {
        // Check if account already exists
        const existing = await this.socialAccountsRepository.findOne({
            where: {
                userId: data.userId,
                platform: data.platform as any,
                accountId: data.platformUserId,
            }
        });

        if (existing) {
            // Update tokens
            await this.updateTokens(
                existing.id,
                data.accessToken,
                data.refreshToken,
                data.tokenExpiresAt
            );
            return this.findById(existing.id);
        }

        // Create new account
        return this.create({
            userId: data.userId,
            platform: data.platform as any,
            accountId: data.platformUserId,
            accountName: data.accountName,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            tokenExpiresAt: data.tokenExpiresAt,
            status: 'active' as any,
        });
    }
}
