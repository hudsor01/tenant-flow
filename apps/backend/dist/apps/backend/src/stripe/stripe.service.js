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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var StripeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const shared_1 = require("@repo/shared");
const stripe_error_handler_1 = require("./stripe-error.handler");
let StripeService = StripeService_1 = class StripeService {
    constructor(configService, errorHandler) {
        this.configService = configService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(StripeService_1.name);
        this._stripe = null;
    }
    get stripe() {
        if (!this._stripe) {
            const secretKey = this.configService.get('STRIPE_SECRET_KEY');
            if (!secretKey) {
                throw new Error(shared_1.STRIPE_ERRORS.CONFIGURATION_ERROR + ': Missing STRIPE_SECRET_KEY');
            }
            this._stripe = new stripe_1.default(secretKey, {
                apiVersion: '2025-07-30.basil',
                typescript: true,
                timeout: 5000,
            });
        }
        return this._stripe;
    }
    get client() {
        return this.stripe;
    }
    async createCustomer(params) {
        return await this.errorHandler.wrapAsync(() => this.stripe.customers.create({
            email: params.email,
            name: params.name,
            metadata: params.metadata
        }), 'createCustomer');
    }
    async getCustomer(customerId) {
        return await this.errorHandler.wrapAsync(async () => {
            try {
                const customer = await this.stripe.customers.retrieve(customerId);
                if (customer.deleted) {
                    return null;
                }
                return customer;
            }
            catch (error) {
                const stripeError = error;
                if (stripeError?.type === 'invalid_request_error' && stripeError?.code === 'resource_missing') {
                    return null;
                }
                throw error;
            }
        }, 'getCustomer');
    }
    async createCheckoutSession(params) {
        try {
            const sessionParams = {
                mode: params.mode,
                success_url: params.successUrl,
                cancel_url: params.cancelUrl,
                metadata: params.metadata,
                allow_promotion_codes: params.allowPromotionCodes ?? true,
                payment_method_collection: params.paymentMethodCollection,
                ui_mode: params.uiMode,
                automatic_tax: {
                    enabled: true
                }
            };
            if (params.customerId) {
                sessionParams.customer = params.customerId;
            }
            else if (params.customerEmail) {
                sessionParams.customer_email = params.customerEmail;
            }
            if (params.mode === 'subscription' && params.priceId) {
                sessionParams.line_items = [{
                        price: params.priceId,
                        quantity: 1
                    }];
            }
            if (params.subscriptionData) {
                sessionParams.subscription_data = {
                    trial_period_days: params.subscriptionData.trialPeriodDays,
                    metadata: params.subscriptionData.metadata
                };
                if (params.subscriptionData.trialSettings?.endBehavior) {
                    sessionParams.subscription_data.trial_settings = {
                        end_behavior: {
                            missing_payment_method: params.subscriptionData.trialSettings.endBehavior.missingPaymentMethod || 'create_invoice'
                        }
                    };
                }
            }
            return await this.stripe.checkout.sessions.create(sessionParams);
        }
        catch (error) {
            this.logger.error('Failed to create checkout session:', error);
            throw error;
        }
    }
    async createPortalSession(params) {
        return await this.errorHandler.executeWithRetry({
            operation: () => this.stripe.billingPortal.sessions.create({
                customer: params.customerId,
                return_url: params.returnUrl
            }),
            metadata: {
                operation: 'createPortalSession',
                resource: 'portal_session',
                metadata: { customerId: params.customerId }
            }
        });
    }
    async getSubscription(subscriptionId) {
        return await this.errorHandler.wrapAsync(async () => {
            try {
                return await this.stripe.subscriptions.retrieve(subscriptionId);
            }
            catch (error) {
                const stripeError = error;
                if (stripeError?.type === 'invalid_request_error' && stripeError?.code === 'resource_missing') {
                    return null;
                }
                throw error;
            }
        }, 'getSubscription');
    }
    async updateSubscription(subscriptionId, params) {
        return await this.errorHandler.executeWithRetry({
            operation: () => this.stripe.subscriptions.update(subscriptionId, params),
            metadata: {
                operation: 'updateSubscription',
                resource: 'subscription',
                metadata: { subscriptionId, updateKeysCount: Object.keys(params).length }
            }
        });
    }
    async cancelSubscription(subscriptionId, immediately = false) {
        return await this.errorHandler.executeWithRetry({
            operation: () => {
                if (immediately) {
                    return this.stripe.subscriptions.cancel(subscriptionId);
                }
                return this.stripe.subscriptions.update(subscriptionId, {
                    cancel_at_period_end: true
                });
            },
            metadata: {
                operation: 'cancelSubscription',
                resource: 'subscription',
                metadata: { subscriptionId, immediately }
            }
        });
    }
    async createPreviewInvoice(params) {
        return await this.errorHandler.executeWithRetry({
            operation: () => this.stripe.invoices.createPreview({
                customer: params.customerId,
                subscription: params.subscriptionId
            }),
            metadata: {
                operation: 'createPreviewInvoice',
                resource: 'invoice',
                metadata: { customerId: params.customerId, subscriptionId: params.subscriptionId }
            }
        });
    }
    async updateSubscriptionWithProration(subscriptionId, params) {
        return await this.errorHandler.executeWithRetry({
            operation: () => this.stripe.subscriptions.update(subscriptionId, {
                items: params.items,
                proration_behavior: params.prorationBehavior || 'create_prorations',
                proration_date: params.prorationDate
            }),
            metadata: {
                operation: 'updateSubscriptionWithProration',
                resource: 'subscription',
                metadata: { subscriptionId, prorationBehavior: params.prorationBehavior }
            }
        });
    }
    constructWebhookEvent(payload, signature, secret, tolerance) {
        return this.errorHandler.wrapSync(() => this.stripe.webhooks.constructEvent(payload, signature, secret, tolerance), 'constructWebhookEvent');
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = StripeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        stripe_error_handler_1.StripeErrorHandler])
], StripeService);
