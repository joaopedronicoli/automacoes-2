import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { UserModule } from '../../entities/user-module.entity';
import { StripeService } from './stripe.service';
import { SubscriptionController, StripeWebhookController } from './stripe.controller';
import { PlansModule } from '../plans/plans.module';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([User, Plan, UserModule]),
        PlansModule,
    ],
    controllers: [SubscriptionController, StripeWebhookController],
    providers: [StripeService],
    exports: [StripeService],
})
export class StripeModule {}
