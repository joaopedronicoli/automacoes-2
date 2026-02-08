import { Controller, Post, Get, Body, Req, UseGuards, RawBodyRequest, Headers } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Request } from 'express';

@Controller('subscriptions')
export class SubscriptionController {
    constructor(private stripeService: StripeService) {}

    @Post('create')
    @UseGuards(JwtAuthGuard)
    async createSubscription(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
        return this.stripeService.createSubscription(req.user.userId, dto.planSlug);
    }

    @Get('status')
    @UseGuards(JwtAuthGuard)
    async getStatus(@Req() req: any) {
        return this.stripeService.getSubscriptionStatus(req.user.userId);
    }

    @Post('cancel')
    @UseGuards(JwtAuthGuard)
    async cancel(@Req() req: any) {
        await this.stripeService.cancelSubscription(req.user.userId);
        return { message: 'Subscription canceled' };
    }
}

@Controller('webhooks/stripe')
export class StripeWebhookController {
    constructor(private stripeService: StripeService) {}

    @Post()
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        await this.stripeService.handleWebhook(req.rawBody, signature);
        return { received: true };
    }
}
