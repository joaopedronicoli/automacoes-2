import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PlansModule } from '../plans/plans.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        forwardRef(() => PlansModule),
    ],
    controllers: [UsersController],
    providers: [UsersService, AdminGuard],
    exports: [UsersService],
})
export class UsersModule {}
