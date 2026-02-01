import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccount } from '../../entities/social-account.entity';
import { SocialAccountsService } from './social-accounts.service';
import { SocialAccountsController } from './social-accounts.controller';
import { EncryptionService } from '../../common/utils/encryption.service';

@Module({
    imports: [TypeOrmModule.forFeature([SocialAccount])],
    providers: [SocialAccountsService, EncryptionService],
    controllers: [SocialAccountsController],
    exports: [SocialAccountsService],
})
export class SocialAccountsModule { }
