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
var BillingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const stripe_billing_service_1 = require("../stripe/stripe-billing.service");
const stripe_service_1 = require("../stripe/stripe.service");
const subscriptions_manager_service_1 = require("../subscriptions/subscriptions-manager.service");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const swagger_1 = require("@nestjs/swagger");
const dto_1 = require("./dto");
let BillingController = BillingController_1 = class BillingController {
    constructor(stripeBillingService, stripeService, subscriptionsService, errorHandler) {
        this.stripeBillingService = stripeBillingService;
        this.stripeService = stripeService;
        this.subscriptionsService = subscriptionsService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(BillingController_1.name);
        this.logger.log('🔧 BillingController constructor called');
        this.logger.log(`🔧 StripeBillingService available: ${!!stripeBillingService}`);
        this.logger.log(`🔧 StripeService available: ${!!stripeService}`);
        this.logger.log(`🔧 SubscriptionsManagerService available: ${!!subscriptionsService}`);
        this.logger.log(`🔧 ErrorHandlerService available: ${!!errorHandler}`);
        this.logger.log('✅ BillingController constructor completed');
    }
    async createCheckoutSession(user, dto) {
        try {
            const existingSubscription = await this.subscriptionsService.getSubscription(user.id);
            if (existingSubscription && ['ACTIVE', 'TRIALING'].includes(existingSubscription.status)) {
                if (!existingSubscription.planType) {
                    throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.BAD_REQUEST, 'Existing subscription has no plan type');
                }
                const currentPlan = await this.subscriptionsService.getPlanById(existingSubscription.planType);
                const newPlan = await this.subscriptionsService.getPlanById(dto.planType);
                if (!newPlan || !currentPlan) {
                    throw this.errorHandler.createNotFoundError('Plan', dto.planType);
                }
                if (newPlan.price.monthly <= currentPlan.price.monthly) {
                    throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.CONFLICT, 'Please use the billing portal to manage your existing subscription', { metadata: { userId: user.id, currentPlan: existingSubscription.planType } });
                }
            }
            const session = await this.stripeBillingService.createCheckoutSession({
                userId: user.id,
                planType: dto.planType,
                billingInterval: dto.billingInterval,
                successUrl: dto.successUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: dto.cancelUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/cancel`,
                couponId: dto.couponId
            });
            this.logger.log('Checkout session created', {
                userId: user.id,
                sessionId: session.sessionId,
                planType: dto.planType
            });
            return {
                sessionId: session.sessionId,
                url: session.url
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.createCheckoutSession',
                metadata: { userId: user.id, planType: dto.planType }
            });
        }
    }
    async createPortalSession(user, _dto) {
        try {
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (!subscription || !subscription.stripeCustomerId) {
                throw this.errorHandler.createNotFoundError('Subscription', user.id);
            }
            const session = await this.stripeBillingService.createCustomerPortalSession({
                userId: user.id,
                returnUrl: _dto.returnUrl || `${process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing`
            });
            this.logger.log('Portal session created', {
                userId: user.id,
                customerId: subscription.stripeCustomerId
            });
            return {
                url: session.url
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.createPortalSession',
                metadata: { userId: user.id }
            });
        }
    }
    async previewSubscriptionUpdate(user, dto) {
        try {
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (!subscription || !subscription.stripeSubscriptionId) {
                throw this.errorHandler.createNotFoundError('Subscription', user.id);
            }
            const newPlan = await this.subscriptionsService.getPlanById(dto.newPlanType);
            if (!newPlan) {
                throw this.errorHandler.createNotFoundError('Plan', dto.newPlanType);
            }
            const newPriceId = dto.newBillingInterval === 'annual'
                ? newPlan.stripePriceIds.annual
                : newPlan.stripePriceIds.monthly;
            if (!newPriceId) {
                throw this.errorHandler.createValidationError(`No ${dto.newBillingInterval} price configured for plan: ${dto.newPlanType}`);
            }
            const stripeSubscription = await this.stripeService.getSubscription(subscription.stripeSubscriptionId);
            if (!stripeSubscription) {
                throw this.errorHandler.createNotFoundError('Stripe subscription', subscription.stripeSubscriptionId);
            }
            const preview = await this.stripeService.createPreviewInvoice({
                customerId: subscription.stripeCustomerId ?? '',
                subscriptionId: subscription.stripeSubscriptionId,
                subscriptionItems: [{
                        id: stripeSubscription.items.data[0]?.id,
                        price: newPriceId
                    }]
            });
            const currentAmount = stripeSubscription.items.data[0]?.price.unit_amount || 0;
            const newAmount = preview.lines.data[0]?.amount || 0;
            const prorationAmount = preview.lines.data
                .filter((line) => line.description?.includes('unused time') || line.amount < 0)
                .reduce((sum, line) => sum + line.amount, 0);
            return {
                currentPlan: subscription.planType,
                newPlan: dto.newPlanType,
                currentBillingInterval: await this.getBillingInterval(subscription.stripePriceId),
                newBillingInterval: dto.newBillingInterval,
                currentAmount: currentAmount / 100,
                newAmount: newAmount / 100,
                prorationAmount: prorationAmount / 100,
                immediatePayment: prorationAmount > 0 ? prorationAmount / 100 : 0,
                nextBillingDate: subscription.currentPeriodEnd,
                currency: preview.currency
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.previewSubscriptionUpdate',
                metadata: { userId: user.id, newPlanType: dto.newPlanType }
            });
        }
    }
    async getPaymentMethods(user) {
        try {
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (!subscription || !subscription.stripeCustomerId) {
                return { paymentMethods: [] };
            }
            const customer = await this.stripeService.getCustomer(subscription.stripeCustomerId);
            if (!customer) {
                return { paymentMethods: [] };
            }
            const paymentMethods = await this.stripeService.client.paymentMethods.list({
                customer: subscription.stripeCustomerId,
                type: 'card'
            });
            const defaultPaymentMethodId = typeof customer.invoice_settings?.default_payment_method === 'string'
                ? customer.invoice_settings.default_payment_method
                : customer.invoice_settings?.default_payment_method?.id;
            return {
                paymentMethods: paymentMethods.data.map(pm => ({
                    id: pm.id,
                    brand: pm.card?.brand,
                    last4: pm.card?.last4,
                    expMonth: pm.card?.exp_month,
                    expYear: pm.card?.exp_year,
                    isDefault: pm.id === defaultPaymentMethodId
                })),
                defaultPaymentMethodId
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.getPaymentMethods',
                metadata: { userId: user.id }
            });
        }
    }
    async updatePaymentMethod(user, dto) {
        try {
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (!subscription || !subscription.stripeCustomerId) {
                throw this.errorHandler.createNotFoundError('Subscription', user.id);
            }
            try {
                await this.stripeService.client.paymentMethods.attach(dto.paymentMethodId, {
                    customer: subscription.stripeCustomerId
                });
            }
            catch (error) {
                if (!error.message?.includes('already attached')) {
                    throw error;
                }
            }
            if (dto.setAsDefault) {
                await this.stripeService.client.customers.update(subscription.stripeCustomerId, {
                    invoice_settings: {
                        default_payment_method: dto.paymentMethodId
                    }
                });
                if (subscription.stripeSubscriptionId) {
                    await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
                        default_payment_method: dto.paymentMethodId
                    });
                }
            }
            this.logger.log('Payment method updated', {
                userId: user.id,
                paymentMethodId: dto.paymentMethodId,
                setAsDefault: dto.setAsDefault
            });
            return {
                success: true,
                message: 'Payment method updated successfully'
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.updatePaymentMethod',
                metadata: { userId: user.id }
            });
        }
    }
    async handleCheckoutSuccess(user, sessionId) {
        try {
            if (!sessionId) {
                throw this.errorHandler.createValidationError('Session ID is required');
            }
            const session = await this.stripeService.client.checkout.sessions.retrieve(sessionId, {
                expand: ['subscription', 'customer']
            });
            if (!session.subscription) {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.INVALID_INPUT, 'Checkout session does not contain a subscription');
            }
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (subscription?.stripeCustomerId !== session.customer) {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.FORBIDDEN, 'Checkout session does not belong to current user');
            }
            this.logger.log('Checkout completed successfully', {
                userId: user.id,
                sessionId,
                subscriptionId: typeof session.subscription === 'string'
                    ? session.subscription
                    : session.subscription.id
            });
            return {
                success: true,
                subscriptionId: typeof session.subscription === 'string'
                    ? session.subscription
                    : session.subscription.id,
                message: 'Thank you for your subscription!'
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'BillingController.handleCheckoutSuccess',
                metadata: { userId: user.id, sessionId }
            });
        }
    }
    async getBillingInterval(stripePriceId) {
        if (!stripePriceId)
            return null;
        const plans = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX'];
        for (const planType of plans) {
            const plan = await this.subscriptionsService.getPlanById(planType);
            if (plan?.stripePriceIds.monthly === stripePriceId)
                return 'monthly';
            if (plan?.stripePriceIds.annual === stripePriceId)
                return 'annual';
        }
        return null;
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('checkout/session'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe checkout session for subscription' }),
    (0, swagger_1.ApiBody)({ type: dto_1.CreateCheckoutSessionDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Checkout session created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request data' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'User already has an active subscription' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateCheckoutSessionDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createCheckoutSession", null);
__decorate([
    (0, common_1.Post)('portal/session'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe billing portal session' }),
    (0, swagger_1.ApiBody)({ type: dto_1.CreatePortalSessionDto }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Portal session created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No subscription found for user' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreatePortalSessionDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "createPortalSession", null);
__decorate([
    (0, common_1.Post)('subscription/preview'),
    (0, swagger_1.ApiOperation)({ summary: 'Preview subscription plan change with proration' }),
    (0, swagger_1.ApiBody)({ type: dto_1.PreviewSubscriptionUpdateDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Preview generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'No subscription found' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.PreviewSubscriptionUpdateDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "previewSubscriptionUpdate", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user payment methods' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment methods retrieved successfully' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Post)('payment-methods/update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update default payment method' }),
    (0, swagger_1.ApiBody)({ type: dto_1.UpdatePaymentMethodDto }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Payment method updated successfully' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UpdatePaymentMethodDto]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "updatePaymentMethod", null);
__decorate([
    (0, common_1.Get)('checkout/success'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle successful checkout redirect' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Checkout success handled' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('session_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingController.prototype, "handleCheckoutSuccess", null);
exports.BillingController = BillingController = BillingController_1 = __decorate([
    (0, swagger_1.ApiTags)('billing'),
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [stripe_billing_service_1.StripeBillingService,
        stripe_service_1.StripeService,
        subscriptions_manager_service_1.SubscriptionsManagerService,
        error_handler_service_1.ErrorHandlerService])
], BillingController);
