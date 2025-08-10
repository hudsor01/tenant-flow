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
var SubscriptionEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const subscription_notification_service_1 = require("./subscription-notification.service");
const prisma_service_1 = require("../prisma/prisma.service");
const subscription_events_1 = require("../common/events/subscription.events");
let SubscriptionEventListener = SubscriptionEventListener_1 = class SubscriptionEventListener {
    constructor(notificationService, prismaService) {
        this.notificationService = notificationService;
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(SubscriptionEventListener_1.name);
    }
    async handlePaymentMethodRequired(event) {
        try {
            this.logger.debug('Handling payment method required event', { event });
            const user = await this.prismaService.user.findUnique({
                where: { id: event.userId },
                select: { email: true, name: true }
            });
            if (!user) {
                this.logger.error(`User not found for payment method required notification: ${event.userId}`);
                return;
            }
            await this.notificationService.sendPaymentMethodRequired({
                userId: event.userId,
                userEmail: user.email,
                userName: user.name || undefined,
                subscriptionId: event.subscriptionId,
                planType: 'FREETRIAL'
            });
            this.logger.debug('Payment method required notification sent successfully');
        }
        catch (error) {
            this.logger.error('Failed to handle payment method required event', error);
        }
    }
    async handleSubscriptionCreated(event) {
        try {
            this.logger.debug('Handling subscription created event', { event });
            const user = await this.prismaService.user.findUnique({
                where: { id: event.userId },
                select: { email: true, name: true }
            });
            if (!user) {
                this.logger.error(`User not found for subscription created notification: ${event.userId}`);
                return;
            }
            await this.notificationService.sendSubscriptionActivated({
                userId: event.userId,
                userEmail: user.email,
                userName: user.name || undefined,
                subscriptionId: event.subscriptionId,
                planType: event.planType
            });
            this.logger.debug('Subscription created notification sent successfully');
        }
        catch (error) {
            this.logger.error('Failed to handle subscription created event', error);
        }
    }
    async handleTrialWillEnd(event) {
        try {
            this.logger.debug('Handling trial will end event', { event });
            const user = await this.prismaService.user.findUnique({
                where: { id: event.userId },
                select: { email: true, name: true }
            });
            if (!user) {
                this.logger.error(`User not found for trial will end notification: ${event.userId}`);
                return;
            }
            await this.notificationService.sendTrialEndingWarning({
                userId: event.userId,
                userEmail: user.email,
                userName: user.name || undefined,
                subscriptionId: event.subscriptionId,
                planType: 'FREETRIAL',
                trialEndDate: event.trialEndDate
            });
            this.logger.debug('Trial will end notification sent successfully');
        }
        catch (error) {
            this.logger.error('Failed to handle trial will end event', error);
        }
    }
    async handlePaymentFailed(event) {
        try {
            this.logger.debug('Handling payment failed event', { event });
            const user = await this.prismaService.user.findUnique({
                where: { id: event.userId },
                select: { email: true, name: true }
            });
            if (!user) {
                this.logger.error(`User not found for payment failed notification: ${event.userId}`);
                return;
            }
            await this.notificationService.sendPaymentFailed({
                userId: event.userId,
                userEmail: user.email,
                userName: user.name || undefined,
                subscriptionId: event.subscriptionId,
                planType: 'FREETRIAL',
                attemptCount: event.attemptCount,
                amountDue: event.amount,
                currency: event.currency,
                nextRetryDate: event.nextRetryAt
            });
            this.logger.debug('Payment failed notification sent successfully');
        }
        catch (error) {
            this.logger.error('Failed to handle payment failed event', error);
        }
    }
};
exports.SubscriptionEventListener = SubscriptionEventListener;
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.PAYMENT_METHOD_REQUIRED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionEventListener.prototype, "handlePaymentMethodRequired", null);
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.SUBSCRIPTION_CREATED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionEventListener.prototype, "handleSubscriptionCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.TRIAL_WILL_END),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionEventListener.prototype, "handleTrialWillEnd", null);
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.PAYMENT_FAILED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionEventListener.prototype, "handlePaymentFailed", null);
exports.SubscriptionEventListener = SubscriptionEventListener = SubscriptionEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [subscription_notification_service_1.SubscriptionNotificationService,
        prisma_service_1.PrismaService])
], SubscriptionEventListener);
