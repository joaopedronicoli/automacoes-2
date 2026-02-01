import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialAccount } from '../../entities/social-account.entity';
import { EncryptionService } from '../../common/utils/encryption.service';

@Injectable()
export class SocialAccountsService {
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
        await this.socialAccountsRepository.update(id, {
            accessToken: this.encryptionService.encrypt(accessToken),
            refreshToken: refreshToken ? this.encryptionService.encrypt(refreshToken) : undefined,
            tokenExpiresAt: expiresAt,
        });
    }
}
