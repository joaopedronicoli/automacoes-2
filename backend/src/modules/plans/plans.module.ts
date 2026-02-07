import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '../../entities/plan.entity';
import { UserModule } from '../../entities/user-module.entity';
import { PlansService } from './plans.service';
import { PlansController, UserModulesController } from './plans.controller';
import { ModuleGuard } from './guards/module.guard';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Plan, UserModule]),
        forwardRef(() => UsersModule),
    ],
    controllers: [PlansController, UserModulesController],
    providers: [PlansService, ModuleGuard],
    exports: [PlansService, ModuleGuard],
})
export class PlansModule {}
