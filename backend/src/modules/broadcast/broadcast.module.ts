import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { BroadcastScheduler } from './broadcast.scheduler';
import { Broadcast } from '../../entities/broadcast.entity';
import { BroadcastHistory } from '../../entities/broadcast-history.entity';
import { ChatwootModule } from '../chatwoot/chatwoot.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { PlansModule } from '../plans/plans.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Broadcast, BroadcastHistory]),
        BullModule.registerQueue({
            name: 'broadcast',
        }),
        MulterModule.register({
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
            },
        }),
        forwardRef(() => ChatwootModule),
        forwardRef(() => IntegrationsModule),
        PlansModule,
    ],
    providers: [BroadcastService, BroadcastScheduler],
    controllers: [BroadcastController],
    exports: [BroadcastService, BullModule],
})
export class BroadcastModule {}
