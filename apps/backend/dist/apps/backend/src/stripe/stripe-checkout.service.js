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
var StripeCheckoutService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeCheckoutService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
let StripeCheckoutService = StripeCheckoutService_1 = class StripeCheckoutService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(StripeCheckoutService_1.name);
        this.isAvailable = false;
        this.logger.log('StripeCheckoutService constructor called');
    }
    onModuleInit() {
        this.logger.log('StripeCheckoutService onModuleInit() called');
        this.logger.log(`ConfigService available: ${!!this.configService}`);
        try {
            const secretKey = this.configService?.get('STRIPE_SECRET_KEY') || process.env.STRIPE_SECRET_KEY;
            this.logger.log(`STRIPE_SECRET_KEY retrieved: ${secretKey ? '[REDACTED]' : 'undefined'}`);
            if (!secretKey) {
                this.logger.warn('STRIPE_SECRET_KEY not configured - Stripe functionality will be disabled');
                this.isAvailable = false;
                return;
            }
            this.stripe = new stripe_1.default(secretKey, {
                apiVersion: '2025-07-30.basil',
                typescript: true,
            });
            this.isAvailable = true;
            this.logger.log('Stripe client initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize Stripe client:', error);
            this.isAvailable = false;
        }
    }
    ensureStripeAvailable() {
        if (!this.isAvailable || !this.stripe) {
            throw new common_1.BadRequestException('Stripe service is not configured or available');
        }
        return this.stripe;
    }
    async createCheckoutSession(userId, request) {
        const stripe = this.ensureStripeAvailable();
        try {
            this.logger.log(`Creating checkout session for user ${userId || 'non-authenticated'}`);
            if (!request.billingInterval) {
                throw new common_1.BadRequestException('Billing interval is required');
            }
            if (!request.lookupKey && !request.priceId) {
                throw new common_1.BadRequestException('Either lookupKey or priceId is required');
            }
            const lineItems = [];
            if (request.lookupKey) {
                lineItems.push({
                    price: request.lookupKey,
                    quantity: 1,
                });
            }
            else if (request.priceId) {
                lineItems.push({
                    price: request.priceId,
                    quantity: 1,
                });
            }
            const mode = request.mode || 'subscription';
            const sessionParams = {
                mode: mode,
                line_items: lineItems,
                success_url: request.successUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: request.cancelUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/pricing`,
                billing_address_collection: 'auto',
                automatic_tax: { enabled: true },
                allow_promotion_codes: request.allowPromotionCodes ?? true,
                client_reference_id: userId || undefined,
                ...(mode === 'payment' ? { customer_creation: 'always' } : {}),
                ...(mode === 'subscription' ? {
                    subscription_data: {
                        ...(request.metadata?.planType === 'free_trial' ? { trial_period_days: 14 } : {}),
                        metadata: {
                            userId: userId || '',
                            source: userId ? 'authenticated_user' : 'new_subscriber',
                            ...request.metadata,
                        }
                    }
                } : {}),
                metadata: {
                    userId: userId || null,
                    source: userId ? 'authenticated_user' : 'new_subscriber',
                    ...request.metadata,
                },
            };
            if (request.customerId) {
                sessionParams.customer = request.customerId;
            }
            else if (request.customerEmail) {
                sessionParams.customer_email = request.customerEmail;
            }
            const session = await stripe.checkout.sessions.create(sessionParams);
            if (!session.url) {
                throw new Error('Failed to create checkout session URL');
            }
            this.logger.log(`Checkout session created: ${session.id}`);
            return {
                url: session.url,
                sessionId: session.id,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create checkout session: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async createPortalSession(userId, request) {
        const stripe = this.ensureStripeAvailable();
        try {
            this.logger.log(`Creating portal session for user ${userId}`);
            if (!request.customerId) {
                throw new common_1.BadRequestException('Customer ID is required');
            }
            try {
                await stripe.customers.retrieve(request.customerId);
            }
            catch (error) {
                if (error instanceof stripe_1.default.errors.StripeError && error.code === 'resource_missing') {
                    throw new common_1.BadRequestException('Customer not found');
                }
                throw error;
            }
            const session = await stripe.billingPortal.sessions.create({
                customer: request.customerId,
                return_url: request.returnUrl || `${this.configService?.get('FRONTEND_URL') || process.env.FRONTEND_URL || 'https://tenantflow.app'}/dashboard`,
            });
            this.logger.log(`Portal session created: ${session.id}`);
            return {
                url: session.url,
            };
        }
        catch (error) {
            this.logger.error(`Failed to create portal session: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async retrieveSession(sessionId) {
        const stripe = this.ensureStripeAvailable();
        try {
            return await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['line_items', 'customer', 'subscription'],
            });
        }
        catch (error) {
            this.logger.error(`Failed to retrieve session: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async createCustomer(email, name, metadata) {
        const stripe = this.ensureStripeAvailable();
        try {
            this.logger.log(`Creating Stripe customer for email: ${email}`);
            const customer = await stripe.customers.create({
                email,
                name,
                metadata,
            });
            this.logger.log(`Stripe customer created: ${customer.id}`);
            return customer;
        }
        catch (error) {
            this.logger.error(`Failed to create customer: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async updateCustomer(customerId, updates) {
        const stripe = this.ensureStripeAvailable();
        try {
            return await stripe.customers.update(customerId, updates);
        }
        catch (error) {
            this.logger.error(`Failed to update customer: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async retrieveCustomer(customerId) {
        const stripe = this.ensureStripeAvailable();
        try {
            const customer = await stripe.customers.retrieve(customerId);
            if (customer.deleted) {
                throw new common_1.BadRequestException('Customer has been deleted');
            }
            return customer;
        }
        catch (error) {
            this.logger.error(`Failed to retrieve customer: ${error.message}`, error.stack);
            if (error instanceof stripe_1.default.errors.StripeError) {
                throw new common_1.BadRequestException({
                    type: error.type,
                    code: error.code,
                    message: error.message,
                });
            }
            throw error;
        }
    }
    async listPrices(active = true) {
        const stripe = this.ensureStripeAvailable();
        try {
            const prices = await stripe.prices.list({
                active,
                expand: ['data.product'],
            });
            return prices.data;
        }
        catch (error) {
            this.logger.error(`Failed to list prices: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.StripeCheckoutService = StripeCheckoutService;
exports.StripeCheckoutService = StripeCheckoutService = StripeCheckoutService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeCheckoutService);
