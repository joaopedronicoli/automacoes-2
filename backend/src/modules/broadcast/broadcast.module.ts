import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MulterModule } from '@nestjs/platform-express';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { Broadcast } from '../../entities/broadcast.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Broadcast]),
        BullModule.registerQueue({
            name: 'broadcast',
        }),
        MulterModule.register({
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
            },
        }),
    ],
    providers: [BroadcastService],
    controllers: [BroadcastController],
    exports: [BroadcastService, BullModule],
})
export class BroadcastModule {}
