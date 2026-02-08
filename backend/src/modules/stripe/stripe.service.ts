import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { User } from '../../entities/user.entity';
import { Plan } from '../../entities/plan.entity';
import { UserModule } from '../../entities/user-module.entity';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private stripe: Stripe;

    constructor(
        private configService: ConfigService,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Plan)
        private planRepo: Repository<Plan>,
        @InjectRepository(UserModule)
        private userModuleRepo: Repository<UserModule>,
        private plansService: PlansService,
    ) {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        this.stripe = new Stripe(secretKey);
    }

    async createOrGetCustomer(user: User): Promise<string> {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const customer = await this.stripe.customers.create({
            email: user.email,
            name: user.name || undefined,
            metadata: { userId: user.id },
        });

        user.stripeCustomerId = customer.id;
        await this.userRepo.save(user);

        return customer.id;
    }

    async createSubscription(userId: string, planSlug: string) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const plan = await this.planRepo.findOne({ where: { slug: planSlug, isActive: true } });
        if (!plan) throw new NotFoundException('Plan not found');
        if (!plan.stripePriceId) throw new BadRequestException('Plan has no Stripe price configured');

        const customerId = await this.createOrGetCustomer(user);

        const subscription = await this.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: plan.stripePriceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.confirmation_secret'],
            metadata: { userId, planId: plan.id },
        });

        // Save subscription info on UserModule
        let um = await this.userModuleRepo.findOne({ where: { userId } });
        if (!um) {
            um = this.userModuleRepo.create({ userId });
        }
        um.stripeSubscriptionId = subscription.id;
        um.stripeStatus = subscription.status;
        await this.userModuleRepo.save(um);

        const invoice = subscription.latest_invoice as Stripe.Invoice;
        const clientSecret = invoice.confirmation_secret?.client_secret;

        return {
            clientSecret,
            subscriptionId: subscription.id,
        };
    }

    async handleWebhook(payload: Buffer, signature: string) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (err) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException('Invalid webhook signature');
        }

        this.logger.log(`Processing Stripe event: ${event.type}`);

        switch (event.type) {
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;
            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }
    }

    private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId = typeof subDetails?.subscription === 'string'
            ? subDetails.subscription
            : subDetails?.subscription?.id;
        if (!subscriptionId) return;

        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata.userId;
        const planId = subscription.metadata.planId;

        if (!userId || !planId) {
            this.logger.warn(`Missing metadata on subscription ${subscriptionId}`);
            return;
        }

        await this.plansService.assignPlan(userId, planId);

        const um = await this.userModuleRepo.findOne({ where: { userId } });
        if (um) {
            um.stripeStatus = 'active';
            um.stripeSubscriptionId = subscriptionId;
            await this.userModuleRepo.save(um);
        }

        this.logger.log(`Plan ${planId} assigned to user ${userId} after payment`);
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        const userId = subscription.metadata.userId;
        if (!userId) return;

        const um = await this.userModuleRepo.findOne({ where: { userId } });
        if (um) {
            um.stripeStatus = subscription.status;
            await this.userModuleRepo.save(um);
        }
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        const userId = subscription.metadata.userId;
        if (!userId) return;

        await this.plansService.assignPlan(userId, null);

        const um = await this.userModuleRepo.findOne({ where: { userId } });
        if (um) {
            um.stripeSubscriptionId = null;
            um.stripeStatus = null;
            await this.userModuleRepo.save(um);
        }

        this.logger.log(`Subscription canceled for user ${userId}`);
    }

    async cancelSubscription(userId: string) {
        const um = await this.userModuleRepo.findOne({ where: { userId } });
        if (!um?.stripeSubscriptionId) {
            throw new BadRequestException('No active subscription found');
        }

        await this.stripe.subscriptions.cancel(um.stripeSubscriptionId);

        await this.plansService.assignPlan(userId, null);

        um.stripeStatus = 'canceled';
        um.stripeSubscriptionId = null;
        await this.userModuleRepo.save(um);

        this.logger.log(`Subscription canceled by user ${userId}`);
    }

    async getSubscriptionStatus(userId: string) {
        const um = await this.userModuleRepo.findOne({
            where: { userId },
            relations: ['plan'],
        });

        if (!um?.stripeSubscriptionId) {
            return {
                status: um?.stripeStatus || null,
                currentPeriodEnd: null,
            };
        }

        try {
            const subscription = await this.stripe.subscriptions.retrieve(um.stripeSubscriptionId);
            const nextBilling = subscription.next_pending_invoice_item_invoice
                ? new Date(subscription.next_pending_invoice_item_invoice * 1000).toISOString()
                : subscription.billing_cycle_anchor
                    ? new Date(subscription.billing_cycle_anchor * 1000).toISOString()
                    : null;
            return {
                status: subscription.status,
                currentPeriodEnd: nextBilling,
            };
        } catch {
            return {
                status: um.stripeStatus || null,
                currentPeriodEnd: null,
            };
        }
    }
}
