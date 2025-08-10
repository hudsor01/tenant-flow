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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const subscriptions_manager_service_1 = require("./subscriptions-manager.service");
const subscription_status_service_1 = require("./subscription-status.service");
const error_handler_service_1 = require("../common/errors/error-handler.service");
function isValidPlanType(planId) {
    return ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX'].includes(planId);
}
let SubscriptionsController = class SubscriptionsController {
    constructor(subscriptionsService, subscriptionStatusService, errorHandler) {
        this.subscriptionsService = subscriptionsService;
        this.subscriptionStatusService = subscriptionStatusService;
        this.errorHandler = errorHandler;
    }
    async getCurrentSubscription(user) {
        return this.subscriptionsService.getUserSubscriptionWithPlan(user.id);
    }
    async getUsageMetrics(user) {
        return this.subscriptionsService.calculateUsageMetrics(user.id);
    }
    async getSubscriptionStatus(user) {
        const [status, experience, paymentUrl] = await Promise.all([
            this.subscriptionStatusService.getUserSubscriptionStatus(user.id),
            this.subscriptionStatusService.getUserExperienceLevel(user.id),
            this.subscriptionStatusService.getPaymentActionUrl(user.id)
        ]);
        return {
            subscription: status,
            experience,
            paymentUrl,
            billingManagementAllowed: await this.subscriptionStatusService.canManageBilling(user.id)
        };
    }
    async checkFeatureAccess(user, feature) {
        return this.subscriptionStatusService.checkFeatureAccess(user.id, feature);
    }
    async getPlans() {
        return this.subscriptionsService.getAvailablePlans();
    }
    async getPlan(planId) {
        if (!isValidPlanType(planId)) {
            throw this.errorHandler.createNotFoundError('Plan', planId);
        }
        const plan = await this.subscriptionsService.getPlanById(planId);
        if (!plan) {
            throw this.errorHandler.createNotFoundError('Plan', planId);
        }
        return plan;
    }
    async createSubscription(user, createSubscriptionDto) {
        try {
            if (!isValidPlanType(createSubscriptionDto.planId)) {
                throw this.errorHandler.createNotFoundError('Plan', createSubscriptionDto.planId);
            }
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (subscription && ['ACTIVE', 'TRIALING'].includes(subscription.status)) {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.CONFLICT, 'User already has an active subscription', { metadata: { userId: user.id } });
            }
            return {
                message: 'For new subscriptions, please use the checkout endpoint at /api/v1/subscriptions/create-checkout-session',
                currentSubscription: subscription
            };
        }
        catch (error) {
            return this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsController.createSubscription',
                metadata: { userId: user.id }
            });
        }
    }
    async cancelSubscription(user) {
        try {
            const subscription = await this.subscriptionsService.getSubscription(user.id);
            if (!subscription || !['ACTIVE', 'TRIALING'].includes(subscription.status)) {
                throw this.errorHandler.createNotFoundError('Active subscription', user.id);
            }
            return {
                message: 'For subscription cancellation, please use the endpoint at /api/v1/subscriptions/cancel',
                currentSubscription: subscription
            };
        }
        catch (error) {
            return this.errorHandler.handleErrorEnhanced(error, {
                operation: 'SubscriptionsController.cancelSubscription',
                metadata: { userId: user.id }
            });
        }
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('current'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getCurrentSubscription", null);
__decorate([
    (0, common_1.Get)('usage'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getUsageMetrics", null);
__decorate([
    (0, common_1.Get)('status'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionStatus", null);
__decorate([
    (0, common_1.Get)('feature-access/:feature'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('feature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "checkFeatureAccess", null);
__decorate([
    (0, common_1.Get)('plans'),
    openapi.ApiResponse({ status: 200, type: [Object] }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('plans/:planId'),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, common_1.Param)('planId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getPlan", null);
__decorate([
    (0, common_1.Post)(),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createSubscription", null);
__decorate([
    (0, common_1.Delete)('current'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancelSubscription", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    __metadata("design:paramtypes", [subscriptions_manager_service_1.SubscriptionsManagerService,
        subscription_status_service_1.SubscriptionStatusService,
        error_handler_service_1.ErrorHandlerService])
], SubscriptionsController);
