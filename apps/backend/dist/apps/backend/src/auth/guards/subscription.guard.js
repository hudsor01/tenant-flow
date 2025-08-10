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
exports.SubscriptionGuard = exports.PAUSED_SUBSCRIPTION_ALLOWED = exports.ALLOW_PAUSED_SUBSCRIPTION = exports.REQUIRE_ACTIVE_SUBSCRIPTION = exports.SUBSCRIPTION_REQUIRED_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("../../prisma/prisma.service");
exports.SUBSCRIPTION_REQUIRED_KEY = 'subscriptionRequired';
const REQUIRE_ACTIVE_SUBSCRIPTION = () => Reflect.metadata(exports.SUBSCRIPTION_REQUIRED_KEY, true);
exports.REQUIRE_ACTIVE_SUBSCRIPTION = REQUIRE_ACTIVE_SUBSCRIPTION;
exports.ALLOW_PAUSED_SUBSCRIPTION = 'allowPausedSubscription';
const PAUSED_SUBSCRIPTION_ALLOWED = () => Reflect.metadata(exports.ALLOW_PAUSED_SUBSCRIPTION, true);
exports.PAUSED_SUBSCRIPTION_ALLOWED = PAUSED_SUBSCRIPTION_ALLOWED;
let SubscriptionGuard = class SubscriptionGuard {
    constructor(reflector, prismaService) {
        this.reflector = reflector;
        this.prismaService = prismaService;
    }
    async canActivate(context) {
        const requiresSubscription = this.reflector.getAllAndOverride(exports.SUBSCRIPTION_REQUIRED_KEY, [context.getHandler(), context.getClass()]);
        const allowsPausedSubscription = this.reflector.getAllAndOverride(exports.ALLOW_PAUSED_SUBSCRIPTION, [context.getHandler(), context.getClass()]);
        if (!requiresSubscription) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.UnauthorizedException('User not authenticated');
        }
        const subscription = await this.prismaService.subscription.findUnique({
            where: { userId: user.id },
            select: {
                status: true,
                stripeSubscriptionId: true,
                planType: true,
                trialEnd: true,
                currentPeriodEnd: true
            }
        });
        if (!subscription) {
            throw new common_1.ForbiddenException({
                code: 'NO_SUBSCRIPTION',
                message: 'Active subscription required',
                action: 'REDIRECT_TO_PRICING'
            });
        }
        const status = subscription.status;
        switch (status) {
            case 'ACTIVE':
                return true;
            case 'TRIALING':
                return true;
            case 'INCOMPLETE':
                if (allowsPausedSubscription) {
                    return true;
                }
                throw new common_1.ForbiddenException({
                    code: 'SUBSCRIPTION_PAUSED',
                    message: 'Your free trial has ended. Add a payment method to continue.',
                    subscriptionId: subscription.stripeSubscriptionId,
                    action: 'REDIRECT_TO_PAYMENT',
                    trialEndDate: subscription.trialEnd,
                    planType: subscription.planType
                });
            case 'INCOMPLETE_EXPIRED':
                throw new common_1.ForbiddenException({
                    code: 'SUBSCRIPTION_EXPIRED',
                    message: 'Your subscription setup expired. Please restart the signup process.',
                    action: 'REDIRECT_TO_PRICING'
                });
            case 'UNPAID':
                throw new common_1.ForbiddenException({
                    code: 'SUBSCRIPTION_UNPAID',
                    message: 'Your subscription is unpaid. Please update your payment method.',
                    subscriptionId: subscription.stripeSubscriptionId,
                    action: 'REDIRECT_TO_PAYMENT_UPDATE'
                });
            case 'PAST_DUE':
                throw new common_1.ForbiddenException({
                    code: 'PAYMENT_FAILED',
                    message: 'Your payment failed. Please update your payment method.',
                    subscriptionId: subscription.stripeSubscriptionId,
                    action: 'REDIRECT_TO_PAYMENT_UPDATE'
                });
            case 'CANCELED':
                throw new common_1.ForbiddenException({
                    code: 'SUBSCRIPTION_CANCELED',
                    message: 'Your subscription has been canceled. Resubscribe to continue.',
                    action: 'REDIRECT_TO_PRICING'
                });
            default:
                throw new common_1.ForbiddenException({
                    code: 'SUBSCRIPTION_ERROR',
                    message: 'Unable to verify subscription status. Please contact support.',
                    action: 'CONTACT_SUPPORT'
                });
        }
    }
};
exports.SubscriptionGuard = SubscriptionGuard;
exports.SubscriptionGuard = SubscriptionGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        prisma_service_1.PrismaService])
], SubscriptionGuard);
