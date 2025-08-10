"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@repo/shared");
const subscription_events_1 = require("../common/events/subscription.events");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_billing_service_1 = require("./stripe-billing.service");
const stripe_service_1 = require("./stripe.service");
let WebhookService = WebhookService_1 = class WebhookService {
    constructor(billingService, stripeService, prismaService, eventEmitter) {
        this.billingService = billingService;
        this.stripeService = stripeService;
        this.prismaService = prismaService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(WebhookService_1.name);
        this.processedEvents = new Set();
    }
    async handleWebhookEvent(event) {
        if (this.processedEvents.has(event.id)) {
            this.logger.log(`Event ${event.id} already processed, skipping`);
            return;
        }
        try {
            this.logger.log(`Processing webhook event: ${event.type}`);
            const eventType = event.type;
            switch (eventType) {
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_CREATED:
                    await this.handleSubscriptionCreated(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_UPDATED:
                    await this.handleSubscriptionUpdated(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_DELETED:
                    await this.handleSubscriptionDeleted(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_TRIAL_WILL_END:
                    await this.handleTrialWillEnd(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_PAUSED:
                    await this.handleSubscriptionPaused(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.SUBSCRIPTION_RESUMED:
                    await this.handleSubscriptionResumed(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_SUCCEEDED:
                    await this.handlePaymentSucceeded(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_FAILED:
                    await this.handlePaymentFailed(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.INVOICE_PAYMENT_ACTION_REQUIRED:
                    await this.handlePaymentActionRequired(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.INVOICE_UPCOMING:
                    await this.handleInvoiceUpcoming(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.CHECKOUT_SESSION_COMPLETED:
                    await this.handleCheckoutCompleted(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.PAYMENT_INTENT_REQUIRES_ACTION:
                    await this.handlePaymentIntentRequiresAction(event);
                    break;
                case shared_1.WEBHOOK_EVENT_TYPES.CHARGE_FAILED:
                    await this.handleChargeFailed(event);
                    break;
                default:
                    this.logger.log(`No handler for event type: ${event.type}`);
                    return;
            }
            this.processedEvents.add(event.id);
            if (this.processedEvents.size > 10000) {
                const firstId = this.processedEvents.values().next().value;
                if (firstId) {
                    this.processedEvents.delete(firstId);
                }
            }
        }
        catch (error) {
            this.logger.error(`Error processing webhook event ${event.type}:`, error);
            throw error;
        }
    }
    async handleSubscriptionCreated(event) {
        const subscription = event.data.object;
        await this.billingService.syncSubscriptionFromStripe(subscription);
        this.logger.log(`Subscription created: ${subscription.id}`);
    }
    async handleSubscriptionUpdated(event) {
        const subscription = event.data.object;
        const previousAttributes = event.data.previous_attributes;
        await this.billingService.syncSubscriptionFromStripe(subscription);
        if (previousAttributes?.status && previousAttributes.status !== subscription.status) {
            this.logger.log(`Subscription ${subscription.id} status changed from ${previousAttributes.status} to ${subscription.status}`);
            if (subscription.status === 'incomplete' && subscription.pause_collection) {
                await this.handleTrialEndedWithoutPayment(subscription);
            }
            if (previousAttributes.status === 'incomplete' && subscription.status === 'active') {
                await this.handleSubscriptionReactivated(subscription);
            }
        }
        this.logger.log(`Subscription updated: ${subscription.id}`);
    }
    async handleSubscriptionDeleted(event) {
        const subscription = event.data.object;
        await this.billingService.handleSubscriptionDeleted(subscription.id);
        this.logger.log(`Subscription deleted: ${subscription.id}`);
    }
    async handleSubscriptionPaused(event) {
        const subscription = event.data.object;
        this.logger.log(`Subscription paused: ${subscription.id}`);
        const dbSubscription = await this.prismaService.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: 'INCOMPLETE',
                updatedAt: new Date()
            },
            include: { User: true }
        });
        if (dbSubscription) {
            await this.restrictUserFeatureAccess(dbSubscription.userId, 'SUBSCRIPTION_PAUSED');
            await this.sendSubscriptionPausedEmail({
                userId: dbSubscription.userId,
                userEmail: dbSubscription.User.email,
                userName: dbSubscription.User.name || undefined,
                subscriptionId: subscription.id,
                planType: dbSubscription.planType || 'FREETRIAL'
            });
        }
    }
    async handleSubscriptionResumed(event) {
        const subscription = event.data.object;
        this.logger.log(`Subscription resumed: ${subscription.id}`);
        await this.billingService.syncSubscriptionFromStripe(subscription);
        const dbSubscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            include: { User: true }
        });
        if (dbSubscription) {
            await this.restoreUserFeatureAccess(dbSubscription.userId, dbSubscription.planType);
            await this.sendSubscriptionResumedEmail({
                userId: dbSubscription.userId,
                userEmail: dbSubscription.User.email,
                userName: dbSubscription.User.name || undefined,
                subscriptionId: subscription.id,
                planType: dbSubscription.planType || 'FREETRIAL'
            });
        }
    }
    async handleTrialWillEnd(event) {
        const subscription = event.data.object;
        this.logger.log(`Trial will end for subscription: ${subscription.id}`);
        const dbSubscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            include: { User: true }
        });
        if (!dbSubscription) {
            this.logger.warn(`Subscription ${subscription.id} not found in database`);
            return;
        }
        const customer = await this.stripeService.client.customers.retrieve(subscription.customer);
        const hasPaymentMethod = customer && !customer.deleted &&
            customer.default_source ||
            customer.invoice_settings?.default_payment_method;
        if (!hasPaymentMethod) {
            this.logger.log(`Sending payment method required email to ${dbSubscription.User.email}`);
            await this.sendPaymentMethodRequiredEmail({
                userId: dbSubscription.User.id,
                userEmail: dbSubscription.User.email,
                userName: dbSubscription.User.name || undefined,
                subscriptionId: subscription.id,
                planType: dbSubscription.planType || 'FREETRIAL',
                trialEndDate: dbSubscription.trialEnd || undefined
            });
        }
    }
    async handlePaymentSucceeded(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId)
            return;
        this.logger.log(`Payment succeeded for subscription: ${subscriptionId}`);
        await this.prismaService.subscription.update({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: 'ACTIVE' }
        });
    }
    async handlePaymentFailed(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) {
            this.logger.warn('Payment failed event received but no subscription ID found', {
                invoiceId: invoice.id,
                customerEmail: invoice.customer_email
            });
            return;
        }
        this.logger.warn(`Payment failed for subscription: ${subscriptionId}`, {
            invoiceId: invoice.id,
            customerEmail: invoice.customer_email,
            attemptCount: invoice.attempt_count,
            amountDue: invoice.amount_due,
            currency: invoice.currency
        });
        try {
            const updatedSubscription = await this.prismaService.subscription.update({
                where: { stripeSubscriptionId: subscriptionId },
                data: { status: 'PAST_DUE' },
                include: { User: true }
            });
            this.logger.warn(`Subscription marked as PAST_DUE`, {
                subscriptionId,
                userId: updatedSubscription.User.id,
                userEmail: updatedSubscription.User.email,
                planType: updatedSubscription.planType
            });
            await this.sendPaymentFailedEmail({
                userId: updatedSubscription.User.id,
                userEmail: updatedSubscription.User.email,
                userName: updatedSubscription.User.name || undefined,
                subscriptionId,
                planType: updatedSubscription.planType || 'BASIC',
                attemptCount: invoice.attempt_count,
                amountDue: invoice.amount_due,
                currency: invoice.currency
            });
            if (invoice.attempt_count >= 3) {
                await this.restrictUserFeatureAccess(updatedSubscription.User.id, 'PAYMENT_FAILED');
            }
        }
        catch (error) {
            this.logger.error(`Failed to update subscription status for ${subscriptionId}:`, error);
        }
    }
    async handleInvoiceUpcoming(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId)
            return;
        this.logger.log(`Upcoming invoice for subscription: ${subscriptionId}`);
        const subscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            include: { User: true }
        });
        if (!subscription) {
            this.logger.warn(`Subscription ${subscriptionId} not found in database`);
            return;
        }
        await this.sendUpcomingInvoiceEmail({
            userId: subscription.User.id,
            userEmail: subscription.User.email,
            userName: subscription.User.name || undefined,
            subscriptionId,
            planType: subscription.planType || 'BASIC',
            invoiceAmount: invoice.amount_due,
            currency: invoice.currency,
            invoiceDate: new Date(invoice.period_end * 1000),
            billingInterval: this.getBillingIntervalFromInvoice(invoice)
        });
        this.logger.log(`Renewal reminder sent to user ${subscription.User.email}`);
    }
    async handlePaymentActionRequired(event) {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId)
            return;
        this.logger.warn(`Payment action required for subscription: ${subscriptionId}`);
        const subscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
            include: { User: true }
        });
        if (!subscription) {
            this.logger.warn(`Subscription ${subscriptionId} not found in database`);
            return;
        }
        await this.sendPaymentActionRequiredEmail({
            userId: subscription.User.id,
            userEmail: subscription.User.email,
            userName: subscription.User.name || undefined,
            subscriptionId,
            planType: subscription.planType || 'FREETRIAL',
            invoiceUrl: invoice.hosted_invoice_url || undefined
        });
        this.logger.log(`Payment action required notification sent to user ${subscription.User.email}`);
    }
    async handlePaymentIntentRequiresAction(event) {
        const paymentIntent = event.data.object;
        this.logger.warn(`Payment intent requires action: ${paymentIntent.id}`);
        const invoice = paymentIntent.invoice ?
            await this.stripeService.client.invoices.retrieve(paymentIntent.invoice) :
            null;
        if (invoice && invoice.subscription) {
            const subscriptionId = invoice.subscription;
            const subscription = await this.prismaService.subscription.findUnique({
                where: { stripeSubscriptionId: subscriptionId },
                include: { User: true }
            });
            if (subscription) {
                await this.sendAuthenticationRequiredEmail({
                    userId: subscription.userId,
                    userEmail: subscription.User.email,
                    userName: subscription.User.name || undefined,
                    subscriptionId,
                    planType: subscription.planType || 'FREETRIAL',
                    paymentIntentId: paymentIntent.id
                });
            }
        }
    }
    async handleChargeFailed(event) {
        const charge = event.data.object;
        this.logger.error(`Charge failed: ${charge.id}`, {
            amount: charge.amount,
            currency: charge.currency,
            failureCode: charge.failure_code,
            failureMessage: charge.failure_message,
            customerEmail: charge.billing_details?.email
        });
        const invoice = charge.invoice ?
            await this.stripeService.client.invoices.retrieve(charge.invoice) :
            null;
        if (invoice && invoice.subscription) {
            const subscriptionId = invoice.subscription;
            const subscription = await this.prismaService.subscription.findUnique({
                where: { stripeSubscriptionId: subscriptionId },
                include: { User: true }
            });
            if (subscription) {
                await this.sendChargeFailedEmail({
                    userId: subscription.userId,
                    userEmail: subscription.User.email,
                    userName: subscription.User.name || undefined,
                    subscriptionId,
                    planType: subscription.planType || 'FREETRIAL',
                    failureCode: charge.failure_code || 'unknown',
                    failureMessage: charge.failure_message || 'Payment could not be processed',
                    amount: charge.amount,
                    currency: charge.currency
                });
                this.logger.error(`Charge failed for user ${subscription.User.email}`, {
                    subscriptionId,
                    chargeId: charge.id,
                    failureCode: charge.failure_code,
                    failureMessage: charge.failure_message
                });
            }
        }
    }
    async handleCheckoutCompleted(event) {
        const session = event.data.object;
        if (session.mode !== 'subscription') {
            this.logger.log(`Ignoring non-subscription checkout session: ${session.mode}`);
            return;
        }
        const subscriptionId = session.subscription;
        const userId = session.metadata?.userId;
        const customerEmail = session.customer_details?.email;
        if (!userId || !subscriptionId) {
            this.logger.error('Missing userId or subscriptionId in checkout session', {
                sessionId: session.id,
                userId,
                subscriptionId,
                customerEmail
            });
            return;
        }
        this.logger.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`, {
            sessionId: session.id,
            customerEmail,
            paymentStatus: session.payment_status
        });
        try {
            const stripeSubscription = await this.stripeService.client.subscriptions.retrieve(subscriptionId);
            await this.billingService.syncSubscriptionFromStripe(stripeSubscription);
            await this.handleSubscriptionActivated(userId, subscriptionId, session);
            this.logger.log(`Successfully processed checkout completion for subscription ${subscriptionId}`);
        }
        catch (error) {
            this.logger.error(`Error processing checkout completion for subscription ${subscriptionId}:`, error);
        }
    }
    async handleSubscriptionActivated(userId, subscriptionId, session) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: { Subscription: true }
        });
        if (!user) {
            this.logger.warn(`User ${userId} not found during subscription activation`);
            return;
        }
        this.logger.log(`Subscription activated successfully`, {
            userId,
            subscriptionId,
            userEmail: user.email,
            sessionId: session.id,
            paymentStatus: session.payment_status
        });
    }
    async handleTrialEndedWithoutPayment(subscription) {
        this.logger.log(`Trial ended without payment method for subscription: ${subscription.id}`);
        const dbSubscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            include: { User: true }
        });
        if (!dbSubscription) {
            this.logger.warn(`Subscription ${subscription.id} not found in database`);
            return;
        }
        await this.prismaService.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
                status: 'INCOMPLETE',
                updatedAt: new Date()
            }
        });
        this.logger.log(`Trial ended without payment method for user ${dbSubscription.User.email}`);
        await this.sendPaymentMethodRequiredEmail({
            userId: dbSubscription.User.id,
            userEmail: dbSubscription.User.email,
            userName: dbSubscription.User.name || undefined,
            subscriptionId: subscription.id,
            planType: dbSubscription.planType || 'FREETRIAL',
            trialEndDate: dbSubscription.trialEnd || undefined
        });
        await this.restrictUserFeatureAccess(dbSubscription.User.id, 'TRIAL_ENDED');
    }
    async handleSubscriptionReactivated(subscription) {
        this.logger.log(`Subscription reactivated: ${subscription.id}`);
        const dbSubscription = await this.prismaService.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
            include: { User: true }
        });
        if (!dbSubscription) {
            this.logger.warn(`Subscription ${subscription.id} not found in database`);
            return;
        }
        this.logger.log(`Subscription reactivated for user ${dbSubscription.User.email}`);
        await this.sendSubscriptionReactivatedEmail({
            userId: dbSubscription.User.id,
            userEmail: dbSubscription.User.email,
            userName: dbSubscription.User.name || undefined,
            subscriptionId: subscription.id,
            planType: dbSubscription.planType || 'BASIC'
        });
        await this.restoreUserFeatureAccess(dbSubscription.User.id, dbSubscription.planType);
    }
    async sendPaymentMethodRequiredEmail(_data) {
    }
    async sendSubscriptionReactivatedEmail(_data) {
    }
    async restrictUserFeatureAccess(userId, reason) {
        const event = {
            userId,
            reason
        };
        this.eventEmitter.emit(subscription_events_1.SubscriptionEventType.FEATURE_ACCESS_RESTRICT, event);
        this.logger.log(`Feature access restriction event emitted for user ${userId}, reason: ${reason}`);
    }
    async sendPaymentFailedEmail(_data) {
    }
    async sendUpcomingInvoiceEmail(_data) {
    }
    getBillingIntervalFromInvoice(invoice) {
        const line = invoice.lines?.data?.[0];
        if (line && 'price' in line && line.price && typeof line.price === 'object' && 'recurring' in line.price && line.price.recurring && typeof line.price.recurring === 'object' && 'interval' in line.price.recurring && line.price.recurring.interval === 'year') {
            return 'annual';
        }
        return 'monthly';
    }
    async restoreUserFeatureAccess(userId, planType) {
        const event = {
            userId,
            planType: (planType || 'FREETRIAL')
        };
        this.eventEmitter.emit(subscription_events_1.SubscriptionEventType.FEATURE_ACCESS_RESTORE, event);
        this.logger.log(`Feature access restoration event emitted for user ${userId}, planType: ${planType}`);
    }
    async sendSubscriptionPausedEmail(_data) {
        this.logger.log(`Subscription paused notification queued for ${_data.userEmail}`);
    }
    async sendSubscriptionResumedEmail(_data) {
        this.logger.log(`Subscription resumed notification queued for ${_data.userEmail}`);
    }
    async sendPaymentActionRequiredEmail(_data) {
        this.logger.log(`Payment action required notification queued for ${_data.userEmail}`);
    }
    async sendAuthenticationRequiredEmail(_data) {
        this.logger.log(`Authentication required notification queued for ${_data.userEmail}`);
    }
    async sendChargeFailedEmail(_data) {
        this.logger.log(`Charge failed notification queued for ${_data.userEmail}`);
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = WebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => stripe_billing_service_1.StripeBillingService))),
    __metadata("design:paramtypes", [stripe_billing_service_1.StripeBillingService,
        stripe_service_1.StripeService,
        prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], WebhookService);
