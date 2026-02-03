import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Integration } from '../../entities/integration.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ChatwootModule } from '../chatwoot/chatwoot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Integration]),
        ChatwootModule,
    ],
    controllers: [IntegrationsController],
    providers: [IntegrationsService],
    exports: [IntegrationsService],
})
export class IntegrationsModule {}
