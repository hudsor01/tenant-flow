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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionStatusService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let SubscriptionStatusService = class SubscriptionStatusService {
    constructor(prismaService) {
        this.prismaService = prismaService;
    }
    async getUserSubscriptionStatus(userId) {
        const subscription = await this.prismaService.subscription.findUnique({
            where: { userId },
            select: {
                id: true,
                status: true,
                planType: true,
                stripeSubscriptionId: true,
                trialEnd: true,
                currentPeriodEnd: true,
                cancelAtPeriodEnd: true,
                canceledAt: true
            }
        });
        if (!subscription) {
            return {
                hasActiveSubscription: false,
                status: null,
                planType: null,
                trialEndsAt: null,
                billingPeriodEndsAt: null,
                canExportData: false,
                canAccessPremiumFeatures: false,
                needsPaymentMethod: false,
                stripeSubscriptionId: null,
                subscriptionId: null
            };
        }
        const isActive = this.isSubscriptionActive(subscription.status);
        const canAccessPaidFeatures = this.canAccessPaidFeatures(subscription.status);
        return {
            hasActiveSubscription: isActive,
            status: subscription.status,
            planType: subscription.planType,
            trialEndsAt: subscription.trialEnd,
            billingPeriodEndsAt: subscription.currentPeriodEnd,
            canExportData: canAccessPaidFeatures,
            canAccessPremiumFeatures: canAccessPaidFeatures,
            needsPaymentMethod: subscription.status === 'INCOMPLETE',
            stripeSubscriptionId: subscription.stripeSubscriptionId,
            subscriptionId: subscription.id
        };
    }
    async canAccessFeature(userId, feature) {
        const status = await this.getUserSubscriptionStatus(userId);
        const restrictedFeatures = [
            'data_export',
            'advanced_analytics',
            'bulk_operations',
            'api_access',
            'premium_integrations'
        ];
        if (restrictedFeatures.includes(feature)) {
            if (!status.hasActiveSubscription) {
                return {
                    allowed: false,
                    reason: 'Active subscription required',
                    action: 'REDIRECT_TO_PRICING'
                };
            }
            if (status.status === 'PAUSED') {
                return {
                    allowed: false,
                    reason: 'Your free trial has ended. Add a payment method to access this feature.',
                    action: 'REDIRECT_TO_PAYMENT',
                    subscriptionId: status.stripeSubscriptionId || undefined,
                    trialEndDate: status.trialEndsAt || undefined
                };
            }
            if (status.status === 'PAST_DUE') {
                return {
                    allowed: false,
                    reason: 'Payment failed. Please update your payment method.',
                    action: 'REDIRECT_TO_PAYMENT',
                    subscriptionId: status.stripeSubscriptionId || undefined
                };
            }
        }
        return { allowed: true };
    }
    async getUserExperienceLevel(userId) {
        const status = await this.getUserSubscriptionStatus(userId);
        if (!status.hasActiveSubscription) {
            return {
                level: 'FREE',
                message: 'Upgrade to access premium features',
                callToAction: 'Start Free Trial',
                redirectUrl: '/pricing'
            };
        }
        switch (status.status) {
            case 'TRIALING': {
                const daysLeft = status.trialEndsAt
                    ? Math.ceil((status.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0;
                return {
                    level: 'TRIAL',
                    message: `${daysLeft} days left in your free trial`,
                    callToAction: 'Add Payment Method',
                    redirectUrl: '/billing'
                };
            }
            case 'ACTIVE':
                return {
                    level: 'PAID',
                    message: `${status.planType} plan active`
                };
            case 'PAUSED':
                return {
                    level: 'PAYMENT_REQUIRED',
                    message: 'Your free trial has ended. Add a payment method to continue using premium features.',
                    callToAction: 'Add Payment Method',
                    redirectUrl: '/billing/payment-method'
                };
            case 'INCOMPLETE':
                return {
                    level: 'PAYMENT_REQUIRED',
                    message: 'Your free trial has ended. Add a payment method to continue using premium features.',
                    callToAction: 'Add Payment Method',
                    redirectUrl: '/billing/payment-method'
                };
            case 'INCOMPLETE_EXPIRED':
                return {
                    level: 'FREE',
                    message: 'Your subscription setup expired',
                    callToAction: 'Start Over',
                    redirectUrl: '/pricing'
                };
            case 'UNPAID':
                return {
                    level: 'PAYMENT_REQUIRED',
                    message: 'Your subscription is unpaid. Please update your payment method.',
                    callToAction: 'Update Payment Method',
                    redirectUrl: '/billing/payment-method'
                };
            case 'PAST_DUE':
                return {
                    level: 'PAYMENT_REQUIRED',
                    message: 'Your payment failed. Please update your payment method to restore access.',
                    callToAction: 'Update Payment Method',
                    redirectUrl: '/billing/payment-method'
                };
            case 'CANCELED':
                return {
                    level: 'FREE',
                    message: 'Your subscription was canceled',
                    callToAction: 'Resubscribe',
                    redirectUrl: '/pricing'
                };
            default:
                return {
                    level: 'FREE',
                    message: 'Unable to verify subscription status',
                    callToAction: 'Contact Support',
                    redirectUrl: '/support'
                };
        }
    }
    async canManageBilling(userId) {
        const subscription = await this.prismaService.subscription.findUnique({
            where: { userId },
            select: { status: true }
        });
        return !!subscription;
    }
    async getPaymentActionUrl(userId) {
        const status = await this.getUserSubscriptionStatus(userId);
        if (!status.stripeSubscriptionId) {
            return '/pricing';
        }
        switch (status.status) {
            case 'PAUSED':
                return '/billing/add-payment-method';
            case 'PAST_DUE':
            case 'INCOMPLETE':
                return '/billing/update-payment-method';
            case 'CANCELED':
                return '/pricing';
            default:
                return '/billing';
        }
    }
    async checkFeatureAccess(userId, feature) {
        return this.canAccessFeature(userId, feature);
    }
    isSubscriptionActive(status) {
        return ['ACTIVE', 'TRIALING'].includes(status);
    }
    canAccessPaidFeatures(status) {
        return ['ACTIVE', 'TRIALING'].includes(status);
    }
};
exports.SubscriptionStatusService = SubscriptionStatusService;
exports.SubscriptionStatusService = SubscriptionStatusService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SubscriptionStatusService);
