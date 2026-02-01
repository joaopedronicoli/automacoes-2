import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationLog } from '../../entities/automation-log.entity';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';

@Module({
    imports: [TypeOrmModule.forFeature([AutomationLog])],
    providers: [LogsService],
    controllers: [LogsController],
    exports: [LogsService],
})
export class LogsModule { }
