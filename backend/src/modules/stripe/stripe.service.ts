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
    private stripe: Stripe | null = null;

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
        if (secretKey) {
            this.stripe = new Stripe(secretKey);
            this.logger.log('Stripe initialized');
        } else {
            this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe features disabled');
        }
    }

    private ensureStripe(): Stripe {
        if (!this.stripe) {
            throw new BadRequestException('Stripe is not configured. Set STRIPE_SECRET_KEY to enable payments.');
        }
        return this.stripe;
    }

    async createOrGetCustomer(user: User): Promise<string> {
        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const customer = await this.ensureStripe().customers.create({
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

        // Check if user already has an active subscription
        const existingUm = await this.userModuleRepo.findOne({ where: { userId } });
        if (existingUm?.stripeSubscriptionId) {
            try {
                const existingSub = await this.ensureStripe().subscriptions.retrieve(existingUm.stripeSubscriptionId);

                // Active subscription → upgrade/downgrade to new plan
                if (existingSub.status === 'active') {
                    const currentPriceId = existingSub.items.data[0]?.price?.id;
                    if (currentPriceId === plan.stripePriceId) {
                        throw new BadRequestException('Você já está neste plano.');
                    }

                    // Update subscription to new price (upgrade/downgrade)
                    const updatedSub = await this.ensureStripe().subscriptions.update(existingSub.id, {
                        items: [{
                            id: existingSub.items.data[0].id,
                            price: plan.stripePriceId,
                        }],
                        proration_behavior: 'create_prorations',
                        metadata: { userId, planId: plan.id },
                    });

                    // Assign new plan
                    await this.plansService.assignPlan(userId, plan.id);
                    existingUm.stripeStatus = updatedSub.status;
                    await this.userModuleRepo.save(existingUm);

                    this.logger.log(`Subscription upgraded to plan ${plan.slug} for user ${userId}`);

                    return {
                        upgraded: true,
                        subscriptionId: updatedSub.id,
                    };
                }

                // If incomplete/past_due, cancel it and create a new one
                if (['incomplete', 'incomplete_expired', 'past_due'].includes(existingSub.status)) {
                    await this.ensureStripe().subscriptions.cancel(existingSub.id);
                    this.logger.log(`Canceled ${existingSub.status} subscription ${existingSub.id} for user ${userId}`);
                }
            } catch (err) {
                if (err instanceof BadRequestException) throw err;
                // Subscription not found on Stripe, proceed to create new one
            }
        }

        const customerId = await this.createOrGetCustomer(user);

        const subscription = await this.ensureStripe().subscriptions.create({
            customer: customerId,
            items: [{ price: plan.stripePriceId }],
            payment_behavior: 'default_incomplete',
            payment_settings: { save_default_payment_method: 'on_subscription' },
            expand: ['latest_invoice.confirmation_secret'],
            metadata: { userId, planId: plan.id },
        });

        // Save subscription info on UserModule
        let um = existingUm;
        if (!um) {
            um = this.userModuleRepo.create({ userId });
        }
        um.stripeSubscriptionId = subscription.id;
        um.stripeStatus = subscription.status;
        await this.userModuleRepo.save(um);

        const invoice = subscription.latest_invoice as Stripe.Invoice;
        const clientSecret = invoice.confirmation_secret?.client_secret;

        if (!clientSecret) {
            this.logger.error(`No clientSecret returned for subscription ${subscription.id}`);
            throw new BadRequestException('Não foi possível iniciar o pagamento. Tente novamente.');
        }

        return {
            clientSecret,
            subscriptionId: subscription.id,
        };
    }

    async handleWebhook(payload: Buffer, signature: string) {
        const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
        let event: Stripe.Event;

        try {
            event = this.ensureStripe().webhooks.constructEvent(payload, signature, webhookSecret);
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

        const subscription = await this.ensureStripe().subscriptions.retrieve(subscriptionId);
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

        await this.ensureStripe().subscriptions.cancel(um.stripeSubscriptionId);

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
            const subscription = await this.ensureStripe().subscriptions.retrieve(um.stripeSubscriptionId);

            // If Stripe says active but plan not assigned yet, assign it now
            if (subscription.status === 'active' && !um.planId) {
                let planId = subscription.metadata.planId;

                // Fallback: find plan by the subscription's price ID
                if (!planId) {
                    const priceId = subscription.items.data[0]?.price?.id;
                    if (priceId) {
                        const plan = await this.planRepo.findOne({ where: { stripePriceId: priceId } });
                        if (plan) {
                            planId = plan.id;
                            this.logger.log(`Resolved planId ${planId} from priceId ${priceId}`);
                        }
                    }
                }

                if (planId) {
                    await this.plansService.assignPlan(userId, planId);
                    um.stripeStatus = 'active';
                    await this.userModuleRepo.save(um);
                    this.logger.log(`Plan ${planId} auto-assigned to user ${userId} via status check`);
                }
            } else if (subscription.status !== um.stripeStatus) {
                um.stripeStatus = subscription.status;
                await this.userModuleRepo.save(um);
            }

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
