import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Automation } from '../../entities/automation.entity';
import { ContactInteraction } from '../../entities/contact-interaction.entity';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { TriggerService } from './trigger.service';
import { ActionExecutorService } from './action-executor.service';
import { FacebookModule } from '../platforms/facebook/facebook.module';
import { LogsModule } from '../logs/logs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Automation, ContactInteraction]),
        forwardRef(() => FacebookModule),
        LogsModule
    ],
    providers: [AutomationsService, TriggerService, ActionExecutorService],
    controllers: [AutomationsController],
    exports: [AutomationsService, TriggerService, ActionExecutorService],
})
export class AutomationsModule { }
