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
var StripeDBService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeDBService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let StripeDBService = StripeDBService_1 = class StripeDBService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(StripeDBService_1.name);
        this.logger.log('StripeDBService initialized with foreign data wrapper');
    }
    async getCustomer(customerId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT id, created, email, name, description, metadata, attrs
                FROM stripe_customers
                WHERE id = ${customerId}
                LIMIT 1
            `;
            return result[0] || null;
        }
        catch (error) {
            this.logger.error('Failed to get customer from Stripe foreign table:', error);
            return null;
        }
    }
    async getCustomers(limit = 100, email) {
        try {
            if (email) {
                const result = await this.prisma.$queryRaw `
                    SELECT id, created, email, name, description, metadata
                    FROM stripe_customers
                    WHERE email = ${email}
                    ORDER BY created DESC
                    LIMIT ${limit}
                `;
                return result;
            }
            else {
                const result = await this.prisma.$queryRaw `
                    SELECT id, created, email, name, description, metadata
                    FROM stripe_customers
                    ORDER BY created DESC
                    LIMIT ${limit}
                `;
                return result;
            }
        }
        catch (error) {
            this.logger.error('Failed to get customers from Stripe foreign table:', error);
            return [];
        }
    }
    async getCustomerSubscriptions(customerId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT 
                    id, customer, status, 
                    current_period_start, current_period_end,
                    trial_start, trial_end,
                    cancel_at, canceled_at,
                    created, metadata
                FROM stripe_subscriptions
                WHERE customer = ${customerId}
                ORDER BY created DESC
            `;
            return result;
        }
        catch (error) {
            this.logger.error('Failed to get customer subscriptions:', error);
            return [];
        }
    }
    async getSubscription(subscriptionId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT 
                    id, customer, status, 
                    current_period_start, current_period_end,
                    trial_start, trial_end,
                    cancel_at, canceled_at,
                    created, metadata
                FROM stripe_subscriptions
                WHERE id = ${subscriptionId}
                LIMIT 1
            `;
            return result[0] || null;
        }
        catch (error) {
            this.logger.error('Failed to get subscription from Stripe foreign table:', error);
            return null;
        }
    }
    async getActiveSubscriptions(limit = 100) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT 
                    s.id, s.customer, c.email as customer_email, c.name as customer_name,
                    s.status, s.current_period_start, s.current_period_end,
                    s.trial_end, s.created
                FROM stripe_subscriptions s
                JOIN stripe_customers c ON s.customer = c.id
                WHERE s.status IN ('active', 'trialing', 'past_due')
                ORDER BY s.created DESC
                LIMIT ${limit}
            `;
            return result;
        }
        catch (error) {
            this.logger.error('Failed to get active subscriptions:', error);
            return [];
        }
    }
    async getProducts(activeOnly = true) {
        try {
            if (activeOnly) {
                const result = await this.prisma.$queryRaw `
                    SELECT id, name, description, active, metadata, created, updated
                    FROM stripe_products
                    WHERE active = true
                    ORDER BY created DESC
                `;
                return result;
            }
            else {
                const result = await this.prisma.$queryRaw `
                    SELECT id, name, description, active, metadata, created, updated
                    FROM stripe_products
                    ORDER BY created DESC
                `;
                return result;
            }
        }
        catch (error) {
            this.logger.error('Failed to get products:', error);
            return [];
        }
    }
    async getProductPrices(productId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT 
                    id, product, currency, unit_amount, recurring, 
                    active, metadata, created
                FROM stripe_prices
                WHERE product = ${productId} AND active = true
                ORDER BY created DESC
            `;
            return result;
        }
        catch (error) {
            this.logger.error('Failed to get product prices:', error);
            return [];
        }
    }
    async getActivePrices(limit = 100) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT 
                    id, product, currency, unit_amount, recurring, 
                    active, metadata, created
                FROM stripe_prices
                WHERE active = true
                ORDER BY created DESC
                LIMIT ${limit}
            `;
            return result;
        }
        catch (error) {
            this.logger.error('Failed to get active prices:', error);
            return [];
        }
    }
    async customerExists(customerId) {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT COUNT(*) as count
                FROM stripe_customers
                WHERE id = ${customerId}
            `;
            return Number(result[0]?.count || 0) > 0;
        }
        catch (error) {
            this.logger.error('Failed to check customer existence:', error);
            return false;
        }
    }
    async getSubscriptionStats() {
        try {
            const result = await this.prisma.$queryRaw `
                SELECT status, COUNT(*) as count
                FROM stripe_subscriptions
                GROUP BY status
                ORDER BY count DESC
            `;
            return result.map((row) => ({
                status: row.status,
                count: Number(row.count)
            }));
        }
        catch (error) {
            this.logger.error('Failed to get subscription stats:', error);
            return [];
        }
    }
    async getRecentSubscriptionActivity(days = 30, limit = 100) {
        try {
            const cutoffTimestamp = Math.floor((Date.now() - (days * 24 * 60 * 60 * 1000)) / 1000);
            const result = await this.prisma.$queryRaw `
                SELECT 
                    s.id, s.customer, c.email as customer_email,
                    s.status, s.created, s.current_period_start, s.current_period_end
                FROM stripe_subscriptions s
                JOIN stripe_customers c ON s.customer = c.id
                WHERE s.created >= ${cutoffTimestamp}
                ORDER BY s.created DESC
                LIMIT ${limit}
            `;
            return result;
        }
        catch (error) {
            this.logger.error('Failed to get recent subscription activity:', error);
            return [];
        }
    }
    async healthCheck() {
        try {
            const [customerCount, subscriptionCount, productCount] = await Promise.all([
                this.prisma.$queryRaw `SELECT COUNT(*) as count FROM stripe_customers`,
                this.prisma.$queryRaw `SELECT COUNT(*) as count FROM stripe_subscriptions`,
                this.prisma.$queryRaw `SELECT COUNT(*) as count FROM stripe_products`
            ]);
            return {
                connected: true,
                customerCount: Number(customerCount[0]?.count || 0),
                subscriptionCount: Number(subscriptionCount[0]?.count || 0),
                productCount: Number(productCount[0]?.count || 0)
            };
        }
        catch (error) {
            this.logger.error('Stripe foreign table health check failed:', error);
            return {
                connected: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
};
exports.StripeDBService = StripeDBService;
exports.StripeDBService = StripeDBService = StripeDBService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StripeDBService);
