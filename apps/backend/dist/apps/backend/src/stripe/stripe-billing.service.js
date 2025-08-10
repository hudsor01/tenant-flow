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
var StripeBillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeBillingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_service_1 = require("./stripe.service");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const billing_plans_1 = require("../shared/constants/billing-plans");
const performance_decorators_1 = require("../common/performance/performance.decorators");
const shared_1 = require("@repo/shared");
let StripeBillingService = class StripeBillingService {
    static { StripeBillingService_1 = this; }
    static { this.DEBUG_TOKEN = 'STRIPE_BILLING_SERVICE_LOADED'; }
    get defaultConfig() {
        this._defaultConfig ??= {
            trialDays: 14,
            automaticTax: true,
            defaultPaymentBehavior: 'default_incomplete'
        };
        return this._defaultConfig;
    }
    getTrialConfigForPlan(planType) {
        const tier = (0, shared_1.getProductTier)(planType);
        return tier.trial;
    }
    constructor(stripeService, prismaService, errorHandler) {
        this.stripeService = stripeService;
        this.prismaService = prismaService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(StripeBillingService_1.name);
        this.planCache = new Map();
        this.priceIdToPlanCache = new Map();
    }
    async createSubscription(params) {
        try {
            if (!params.planType && !params.priceId) {
                throw this.errorHandler.createValidationError('Either planType or priceId must be provided');
            }
            const user = await this.getUserWithSubscription(params.userId);
            const customerId = await this.ensureStripeCustomer(user);
            const planType = params.planType || 'STARTER';
            const priceId = params.priceId || this.getPriceIdFromPlan(planType, params.billingInterval || 'monthly');
            const trialConfig = this.getTrialConfigForPlan(planType);
            const trialDays = params.trialDays ?? trialConfig.trialPeriodDays;
            const subscriptionData = await this.createStripeSubscription({
                customerId,
                priceId,
                paymentMethodId: params.paymentMethodId,
                trialDays,
                trialConfig,
                automaticTax: params.automaticTax ?? this.defaultConfig.automaticTax,
                couponId: params.couponId,
                planType
            });
            await this.storeSubscriptionInDatabase({
                userId: params.userId,
                subscriptionData,
                planType: params.planType,
                priceId
            });
            const invoice = subscriptionData.latest_invoice;
            let clientSecret;
            let paymentIntentId;
            if (invoice && 'payment_intent' in invoice) {
                const paymentIntent = invoice.payment_intent;
                if (typeof paymentIntent === 'object' && paymentIntent && 'client_secret' in paymentIntent) {
                    clientSecret = paymentIntent.client_secret || undefined;
                    paymentIntentId = paymentIntent.id;
                }
                else if (typeof paymentIntent === 'string') {
                    paymentIntentId = paymentIntent;
                }
            }
            return {
                subscriptionId: subscriptionData.id,
                clientSecret,
                status: subscriptionData.status,
                paymentIntentId,
                priceId,
                customerId
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'createSubscription',
                resource: 'subscription',
                metadata: { userId: params.userId, planType: params.planType }
            });
        }
    }
    async createCheckoutSession(params) {
        try {
            const user = await this.getUserWithSubscription(params.userId);
            const customerId = await this.ensureStripeCustomer(user);
            const priceId = this.getPriceIdFromPlan(params.planType, params.billingInterval);
            const trialConfig = this.getTrialConfigForPlan(params.planType);
            const trialEndBehavior = trialConfig.trialEndBehavior === 'cancel' ? 'cancel' : 'pause';
            const sessionParams = {
                customer: customerId,
                mode: 'subscription',
                payment_method_types: ['card'],
                line_items: [{
                        price: priceId,
                        quantity: 1
                    }],
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                subscription_data: {
                    trial_period_days: trialConfig.trialPeriodDays,
                    metadata: {
                        userId: params.userId,
                        planType: params.planType
                    },
                    trial_settings: {
                        end_behavior: {
                            missing_payment_method: trialEndBehavior
                        }
                    }
                },
                automatic_tax: {
                    enabled: this.defaultConfig.automaticTax
                },
                payment_method_collection: trialConfig.collectPaymentMethod ? 'always' : 'if_required'
            };
            if (params.couponId) {
                sessionParams.discounts = [{ coupon: params.couponId }];
            }
            const session = await this.stripeService.client.checkout.sessions.create(sessionParams);
            return {
                sessionId: session.id,
                url: session.url || ''
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'createCheckoutSession',
                resource: 'checkout',
                metadata: { userId: params.userId }
            });
        }
    }
    async updateSubscription(params) {
        try {
            const subscription = await this.stripeService.client.subscriptions.retrieve(params.subscriptionId);
            if (!subscription) {
                throw this.errorHandler.createNotFoundError('Subscription', params.subscriptionId);
            }
            const priceId = params.newPriceId || this.getPriceIdFromPlan(params.newPlanType || 'STARTER', params.billingInterval || 'monthly');
            const updatedSubscription = await this.stripeService.client.subscriptions.update(params.subscriptionId, {
                items: [{
                        id: subscription.items.data[0]?.id,
                        price: priceId
                    }],
                proration_behavior: params.prorationBehavior || 'create_prorations'
            });
            await this.updateSubscriptionInDatabase({
                userId: params.userId,
                subscriptionData: updatedSubscription,
                planType: params.newPlanType,
                priceId
            });
            return {
                subscriptionId: updatedSubscription.id,
                status: updatedSubscription.status,
                priceId,
                customerId: typeof updatedSubscription.customer === 'string'
                    ? updatedSubscription.customer
                    : updatedSubscription.customer.id
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'updateSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            });
        }
    }
    async createCustomerPortalSession(params) {
        try {
            const user = await this.getUserWithSubscription(params.userId);
            const customerId = await this.ensureStripeCustomer(user);
            const session = await this.stripeService.client.billingPortal.sessions.create({
                customer: customerId,
                return_url: params.returnUrl
            });
            return { url: session.url };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'createCustomerPortalSession',
                resource: 'portal_session',
                metadata: { userId: params.userId }
            });
        }
    }
    async reactivateSubscription(params) {
        try {
            const user = await this.getUserWithSubscription(params.userId);
            const customerId = await this.ensureStripeCustomer(user);
            await this.stripeService.client.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: params.paymentMethodId
                }
            });
            const subscription = await this.stripeService.client.subscriptions.update(params.subscriptionId, {
                default_payment_method: params.paymentMethodId,
                pause_collection: null
            });
            await this.prismaService.subscription.updateMany({
                where: {
                    stripeSubscriptionId: params.subscriptionId,
                    userId: params.userId
                },
                data: {
                    status: subscription.status
                }
            });
            return { status: subscription.status };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'reactivateSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            });
        }
    }
    async cancelSubscription(params) {
        try {
            const cancelParams = {
                metadata: {
                    cancellation_reason: params.cancellationReason || 'user_requested'
                }
            };
            let subscription;
            if (params.immediately) {
                subscription = await this.stripeService.client.subscriptions.cancel(params.subscriptionId);
            }
            else {
                subscription = await this.stripeService.client.subscriptions.update(params.subscriptionId, { ...cancelParams, cancel_at_period_end: true });
            }
            await this.prismaService.subscription.updateMany({
                where: {
                    stripeSubscriptionId: params.subscriptionId,
                    userId: params.userId
                },
                data: {
                    status: subscription.status,
                    canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null
                }
            });
            return {
                status: subscription.status,
                canceledAt: subscription.canceled_at || undefined
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'cancelSubscription',
                resource: 'subscription',
                metadata: { subscriptionId: params.subscriptionId, userId: params.userId }
            });
        }
    }
    async getUserWithSubscription(userId) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId },
            include: { Subscription: true }
        });
        if (!user) {
            throw this.errorHandler.createNotFoundError('User', userId);
        }
        return user;
    }
    async ensureStripeCustomer(user) {
        let customerId = user.Subscription?.[0]?.stripeCustomerId;
        if (!customerId) {
            const customer = await this.stripeService.createCustomer({
                email: user.email,
                name: user.name || undefined,
                metadata: { userId: user.id }
            });
            customerId = customer.id;
            await this.prismaService.user.update({
                where: { id: user.id },
                data: {
                    stripeCustomerId: customerId,
                    updatedAt: new Date()
                }
            });
            this.logger.debug('Created and linked Stripe customer', {
                userId: user.id,
                customerId,
                email: user.email
            });
        }
        return customerId;
    }
    getPriceIdFromPlan(planType, billingInterval) {
        const priceId = (0, shared_1.getStripePriceId)(planType, billingInterval);
        if (priceId) {
            return priceId;
        }
        let plan = this.planCache.get(planType);
        if (!plan) {
            plan = (0, billing_plans_1.getPlanById)(planType);
            if (plan) {
                this.planCache.set(planType, plan);
            }
        }
        if (!plan) {
            throw this.errorHandler.createValidationError(`Invalid plan type: ${planType}`);
        }
        const fallbackPriceId = billingInterval === 'annual' ? plan.stripePriceIds.annual : plan.stripePriceIds.monthly;
        if (!fallbackPriceId) {
            throw this.errorHandler.createValidationError(`No ${billingInterval} price configured for plan: ${planType}`);
        }
        return fallbackPriceId;
    }
    async createStripeSubscription(params) {
        const subscriptionData = {
            customer: params.customerId,
            items: [{ price: params.priceId }],
            payment_behavior: this.defaultConfig.defaultPaymentBehavior,
            payment_settings: {
                save_default_payment_method: 'on_subscription'
            },
            expand: ['latest_invoice.payment_intent'],
            trial_period_days: params.trialDays,
            automatic_tax: {
                enabled: params.automaticTax
            }
        };
        if (params.trialConfig && params.trialDays > 0) {
            const trialEndBehavior = params.trialConfig.trialEndBehavior === 'cancel' ? 'cancel' : 'pause';
            subscriptionData.trial_settings = {
                end_behavior: {
                    missing_payment_method: trialEndBehavior
                }
            };
            if (params.trialConfig.collectPaymentMethod) {
                subscriptionData.payment_behavior = 'default_incomplete';
            }
            else {
                subscriptionData.payment_behavior = 'allow_incomplete';
            }
        }
        if (params.paymentMethodId) {
            subscriptionData.default_payment_method = params.paymentMethodId;
        }
        if (params.couponId) {
            subscriptionData.discounts = [{ coupon: params.couponId }];
        }
        subscriptionData.metadata = {
            planType: params.planType || 'STARTER',
            customerId: params.customerId
        };
        return await this.stripeService.client.subscriptions.create(subscriptionData);
    }
    async storeSubscriptionInDatabase(params) {
        const customerId = typeof params.subscriptionData.customer === 'string'
            ? params.subscriptionData.customer
            : params.subscriptionData.customer.id;
        const statusMap = {
            trialing: 'TRIALING',
            active: 'ACTIVE',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE'
        };
        await this.prismaService.subscription.upsert({
            where: { userId: params.userId },
            create: {
                userId: params.userId,
                stripeSubscriptionId: params.subscriptionData.id,
                stripeCustomerId: customerId,
                status: statusMap[params.subscriptionData.status],
                planType: params.planType || 'STARTER',
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000)
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000)
                    : null,
                trialStart: params.subscriptionData.trial_start
                    ? new Date(params.subscriptionData.trial_start * 1000)
                    : null,
                trialEnd: params.subscriptionData.trial_end
                    ? new Date(params.subscriptionData.trial_end * 1000)
                    : null,
            },
            update: {
                stripeSubscriptionId: params.subscriptionData.id,
                status: statusMap[params.subscriptionData.status],
                planType: params.planType || 'STARTER',
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000)
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000)
                    : null,
            }
        });
    }
    async updateSubscriptionInDatabase(params) {
        const statusMap = {
            trialing: 'TRIALING',
            active: 'ACTIVE',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE'
        };
        await this.prismaService.subscription.updateMany({
            where: {
                userId: params.userId,
                stripeSubscriptionId: params.subscriptionData.id
            },
            data: {
                status: statusMap[params.subscriptionData.status],
                planType: params.planType,
                stripePriceId: params.priceId,
                currentPeriodStart: params.subscriptionData.items?.data?.[0]?.current_period_start
                    ? new Date(params.subscriptionData.items.data[0].current_period_start * 1000)
                    : null,
                currentPeriodEnd: params.subscriptionData.items?.data?.[0]?.current_period_end
                    ? new Date(params.subscriptionData.items.data[0].current_period_end * 1000)
                    : null,
            }
        });
    }
    async syncSubscriptionFromStripe(stripeSubscription) {
        const customerId = typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer.id;
        const subscription = await this.prismaService.subscription.findFirst({
            where: { stripeCustomerId: customerId }
        });
        if (!subscription) {
            this.logger.warn(`No subscription found for customer ${typeof stripeSubscription.customer === 'string'
                ? stripeSubscription.customer
                : stripeSubscription.customer.id}`);
            return;
        }
        const status = this.mapStripeStatus(stripeSubscription.status);
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const planType = priceId ? this.getPlanTypeFromPriceId(priceId) : subscription.planType;
        await this.prismaService.subscription.update({
            where: { id: subscription.id },
            data: {
                stripeSubscriptionId: stripeSubscription.id,
                status: status,
                planType,
                stripePriceId: priceId,
                currentPeriodStart: stripeSubscription.items?.data?.[0]?.current_period_start
                    ? new Date(stripeSubscription.items.data[0].current_period_start * 1000)
                    : null,
                currentPeriodEnd: stripeSubscription.items?.data?.[0]?.current_period_end
                    ? new Date(stripeSubscription.items.data[0].current_period_end * 1000)
                    : null,
                trialStart: stripeSubscription.trial_start
                    ? new Date(stripeSubscription.trial_start * 1000)
                    : null,
                trialEnd: stripeSubscription.trial_end
                    ? new Date(stripeSubscription.trial_end * 1000)
                    : null,
                cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
                canceledAt: stripeSubscription.canceled_at
                    ? new Date(stripeSubscription.canceled_at * 1000)
                    : null
            }
        });
    }
    async handleSubscriptionDeleted(stripeSubscriptionId) {
        await this.prismaService.subscription.updateMany({
            where: { stripeSubscriptionId },
            data: {
                status: 'CANCELED',
                cancelAtPeriodEnd: false,
                canceledAt: new Date()
            }
        });
    }
    mapStripeStatus(stripeStatus) {
        const statusMap = {
            trialing: 'TRIALING',
            active: 'ACTIVE',
            past_due: 'PAST_DUE',
            canceled: 'CANCELED',
            unpaid: 'UNPAID',
            incomplete: 'INCOMPLETE',
            incomplete_expired: 'INCOMPLETE_EXPIRED',
            paused: 'INCOMPLETE'
        };
        return statusMap[stripeStatus] || 'CANCELED';
    }
    getPlanTypeFromPriceId(priceId) {
        if (this.priceIdToPlanCache.has(priceId)) {
            return this.priceIdToPlanCache.get(priceId) || null;
        }
        for (const [planType, plan] of Object.entries(billing_plans_1.BILLING_PLANS)) {
            if (plan.stripePriceIds.monthly === priceId || plan.stripePriceIds.annual === priceId) {
                const result = planType;
                this.priceIdToPlanCache.set(priceId, result);
                return result;
            }
        }
        this.priceIdToPlanCache.set(priceId, null);
        return null;
    }
};
exports.StripeBillingService = StripeBillingService;
__decorate([
    (0, performance_decorators_1.MeasureMethod)(200),
    (0, performance_decorators_1.AsyncTimeout)(10000, 'Subscription creation timed out'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StripeBillingService.prototype, "createSubscription", null);
__decorate([
    (0, performance_decorators_1.MeasureMethod)(150),
    (0, performance_decorators_1.AsyncTimeout)(8000, 'Checkout session creation timed out'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StripeBillingService.prototype, "createCheckoutSession", null);
__decorate([
    (0, performance_decorators_1.MeasureMethod)(200),
    (0, performance_decorators_1.AsyncTimeout)(10000, 'Subscription update timed out'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StripeBillingService.prototype, "updateSubscription", null);
exports.StripeBillingService = StripeBillingService = StripeBillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(stripe_service_1.StripeService)),
    __param(1, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __param(2, (0, common_1.Inject)(error_handler_service_1.ErrorHandlerService)),
    __metadata("design:paramtypes", [stripe_service_1.StripeService,
        prisma_service_1.PrismaService,
        error_handler_service_1.ErrorHandlerService])
], StripeBillingService);
