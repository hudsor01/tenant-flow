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
var SubscriptionsManagerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsManagerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const billing_plans_1 = require("../shared/constants/billing-plans");
const error_handler_service_1 = require("../common/errors/error-handler.service");
let SubscriptionsManagerService = SubscriptionsManagerService_1 = class SubscriptionsManagerService {
    constructor(prismaService, errorHandler) {
        this.prismaService = prismaService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(SubscriptionsManagerService_1.name);
    }
    async getSubscription(userId) {
        try {
            const subscription = await this.prismaService.subscription.findUnique({
                where: { userId }
            });
            if (!subscription) {
                this.logger.debug(`No subscription found for user ${userId}, creating free subscription`);
                return await this.createFreeSubscription(userId);
            }
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to get subscription for user ${userId}`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsService.getSubscription',
                resource: 'subscription',
                metadata: { userId }
            });
        }
    }
    async createFreeSubscription(userId) {
        try {
            const subscription = await this.prismaService.subscription.create({
                data: {
                    userId,
                    planType: 'FREETRIAL',
                    status: 'ACTIVE'
                }
            });
            this.logger.log(`Created free subscription for user ${userId}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to create free subscription for user ${userId}`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsService.createFreeSubscription',
                resource: 'subscription',
                metadata: { userId }
            });
        }
    }
    async getAvailablePlans() {
        return Object.values(billing_plans_1.BILLING_PLANS)
            .filter((plan) => plan.id !== 'FREETRIAL')
            .map((plan) => ({
            id: plan.id,
            uiId: plan.id,
            name: plan.name,
            description: `${plan.name} plan with ${plan.propertyLimit === -1 ? 'unlimited' : plan.propertyLimit} properties`,
            price: {
                monthly: plan.price,
                annual: plan.price * 10
            },
            stripePriceIds: {
                monthly: plan.stripePriceIds.monthly,
                annual: plan.stripePriceIds.annual
            },
            features: [
                `${plan.propertyLimit === -1 ? 'Unlimited' : plan.propertyLimit} properties`,
                'Email support',
                plan.id === 'TENANTFLOW_MAX' ? 'Priority support' : 'Standard support'
            ],
            propertyLimit: plan.propertyLimit,
            storageLimit: plan.id === 'TENANTFLOW_MAX' ? -1 : plan.propertyLimit * 10,
            apiCallLimit: plan.id === 'TENANTFLOW_MAX' ? -1 : plan.propertyLimit * 1000,
            priority: plan.id === 'TENANTFLOW_MAX'
        }));
    }
    async getPropertyCount(userId) {
        return this.prismaService.property.count({
            where: { ownerId: userId }
        });
    }
    async canAddProperty(userId) {
        const subscription = await this.getSubscription(userId);
        if (!subscription) {
            return false;
        }
        if (!['ACTIVE', 'TRIALING'].includes(subscription.status)) {
            return false;
        }
        if (!subscription.planType) {
            return false;
        }
        const plan = (0, billing_plans_1.getPlanById)(subscription.planType);
        if (!plan) {
            return false;
        }
        if (plan.propertyLimit === -1) {
            return true;
        }
        const propertyCount = await this.getPropertyCount(userId);
        return propertyCount < plan.propertyLimit;
    }
    async getUsageLimits(userId) {
        const subscription = await this.getSubscription(userId);
        if (!subscription) {
            throw new Error('No subscription found');
        }
        if (!subscription.planType) {
            throw new Error('No plan type found');
        }
        const plan = (0, billing_plans_1.getPlanById)(subscription.planType);
        if (!plan) {
            throw new Error('Invalid plan type');
        }
        const propertyCount = await this.getPropertyCount(userId);
        return {
            properties: {
                used: propertyCount,
                limit: plan.propertyLimit === -1 ? 999 : plan.propertyLimit
            },
            planName: plan.name,
            canUpgrade: subscription.planType !== 'TENANTFLOW_MAX'
        };
    }
    async updateSubscriptionStatus(userId, status) {
        return this.prismaService.subscription.update({
            where: { userId },
            data: { status }
        });
    }
    async getUserSubscriptionWithPlan(userId) {
        const subscription = await this.getSubscription(userId);
        if (!subscription || !subscription.planType) {
            return { subscription, plan: null };
        }
        const billingPlan = (0, billing_plans_1.getPlanById)(subscription.planType);
        if (!billingPlan) {
            return { subscription, plan: null };
        }
        const plan = {
            id: billingPlan.id,
            uiId: billingPlan.id,
            name: billingPlan.name,
            description: `${billingPlan.name} plan with ${billingPlan.propertyLimit === -1 ? 'unlimited' : billingPlan.propertyLimit} properties`,
            price: {
                monthly: billingPlan.price,
                annual: billingPlan.price * 10
            },
            stripePriceIds: {
                monthly: billingPlan.stripePriceIds.monthly,
                annual: billingPlan.stripePriceIds.annual
            },
            features: [
                `${billingPlan.propertyLimit === -1 ? 'Unlimited' : billingPlan.propertyLimit} properties`,
                'Email support',
                billingPlan.id === 'TENANTFLOW_MAX' ? 'Priority support' : 'Standard support'
            ],
            propertyLimit: billingPlan.propertyLimit,
            storageLimit: billingPlan.id === 'TENANTFLOW_MAX' ? -1 : billingPlan.propertyLimit * 10,
            apiCallLimit: billingPlan.id === 'TENANTFLOW_MAX' ? -1 : billingPlan.propertyLimit * 1000,
            priority: billingPlan.id === 'TENANTFLOW_MAX'
        };
        return { subscription, plan };
    }
    async calculateUsageMetrics(userId) {
        const [properties, tenants] = await Promise.all([
            this.prismaService.property.count({
                where: { ownerId: userId }
            }),
            this.prismaService.tenant.count({
                where: {
                    Lease: {
                        some: {
                            Unit: {
                                Property: {
                                    ownerId: userId
                                }
                            }
                        }
                    }
                }
            })
        ]);
        return { properties, tenants };
    }
    async getPlanById(planId) {
        const billingPlan = (0, billing_plans_1.getPlanById)(planId);
        if (!billingPlan) {
            return null;
        }
        return {
            id: billingPlan.id,
            uiId: billingPlan.id,
            name: billingPlan.name,
            description: `${billingPlan.name} plan with ${billingPlan.propertyLimit === -1 ? 'unlimited' : billingPlan.propertyLimit} properties`,
            price: {
                monthly: billingPlan.price,
                annual: billingPlan.price * 10
            },
            features: [
                `${billingPlan.propertyLimit === -1 ? 'Unlimited' : billingPlan.propertyLimit} properties`,
                'Email support',
                billingPlan.id === 'TENANTFLOW_MAX' ? 'Priority support' : 'Standard support'
            ],
            propertyLimit: billingPlan.propertyLimit,
            storageLimit: billingPlan.id === 'TENANTFLOW_MAX' ? -1 : billingPlan.propertyLimit * 10,
            apiCallLimit: billingPlan.id === 'TENANTFLOW_MAX' ? -1 : billingPlan.propertyLimit * 1000,
            priority: billingPlan.id === 'TENANTFLOW_MAX',
            stripePriceIds: {
                monthly: billingPlan.stripePriceIds.monthly || null,
                annual: billingPlan.stripePriceIds.annual || null
            }
        };
    }
    async updateSubscriptionFromStripe(userId, planType, stripeSubscriptionId, status = 'ACTIVE') {
        try {
            const subscription = await this.prismaService.subscription.upsert({
                where: { userId },
                update: {
                    planType,
                    stripeSubscriptionId,
                    status,
                    updatedAt: new Date()
                },
                create: {
                    userId,
                    planType,
                    stripeSubscriptionId,
                    status
                }
            });
            this.logger.log(`Updated subscription for user ${userId} to plan ${planType}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to update subscription from Stripe`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsService.updateSubscriptionFromStripe',
                resource: 'subscription',
                metadata: { userId, planType, stripeSubscriptionId }
            });
        }
    }
    async updateSubscriptionCancellation(userId, cancelAtPeriodEnd, canceledAt) {
        try {
            const subscription = await this.prismaService.subscription.update({
                where: { userId },
                data: {
                    status: cancelAtPeriodEnd ? 'ACTIVE' : 'CANCELED',
                    cancelAtPeriodEnd,
                    canceledAt,
                    updatedAt: new Date()
                }
            });
            this.logger.log(`Updated subscription cancellation for user ${userId}: ` +
                `cancelAtPeriodEnd=${cancelAtPeriodEnd}`);
            return subscription;
        }
        catch (error) {
            this.logger.error(`Failed to update subscription cancellation`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsService.updateSubscriptionCancellation',
                resource: 'subscription',
                metadata: { userId, cancelAtPeriodEnd: String(cancelAtPeriodEnd) }
            });
        }
    }
};
exports.SubscriptionsManagerService = SubscriptionsManagerService;
exports.SubscriptionsManagerService = SubscriptionsManagerService = SubscriptionsManagerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        error_handler_service_1.ErrorHandlerService])
], SubscriptionsManagerService);
