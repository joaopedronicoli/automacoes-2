import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatwootAccount } from '../../entities/chatwoot-account.entity';
import { EvolutionInstance } from '../../entities/evolution-instance.entity';
import { User } from '../../entities/user.entity';
import { ChatwootPlatformController } from './chatwoot-platform.controller';
import { ChatwootPlatformService } from './chatwoot-platform.service';
import { EvolutionApiService } from './evolution-api.service';
import { ChatwootManagementService } from './chatwoot-management.service';
import { PlansModule } from '../plans/plans.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatwootAccount, EvolutionInstance, User]),
        PlansModule,
    ],
    controllers: [ChatwootPlatformController],
    providers: [ChatwootPlatformService, EvolutionApiService, ChatwootManagementService],
    exports: [ChatwootManagementService],
})
export class ChatwootPlatformModule {}
