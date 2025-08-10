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
var PaymentRecoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRecoveryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_service_1 = require("./stripe.service");
const error_handler_service_1 = require("../common/errors/error-handler.service");
let PaymentRecoveryService = PaymentRecoveryService_1 = class PaymentRecoveryService {
    constructor(prismaService, stripeService, errorHandler) {
        this.prismaService = prismaService;
        this.stripeService = stripeService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(PaymentRecoveryService_1.name);
        this.defaultOptions = {
            maxRetries: 4,
            retryDelayHours: [0, 24, 72, 168],
            sendReminders: true,
            pauseOnFailure: true
        };
    }
    async handlePaymentFailure(invoice, options) {
        const opts = { ...this.defaultOptions, ...options };
        try {
            const subscription = await this.getSubscriptionFromInvoice(invoice);
            if (!subscription) {
                this.logger.warn('No subscription found for failed invoice', {
                    invoiceId: invoice.id,
                    customerId: invoice.customer
                });
                return;
            }
            await this.logPaymentFailure(subscription.id, invoice);
            const attemptNumber = invoice.attempt_count || 1;
            if (opts.sendReminders) {
                await this.sendPaymentFailureNotification(subscription.userId, attemptNumber, invoice);
            }
            if (attemptNumber >= (opts.maxRetries || 4)) {
                await this.handleFinalPaymentFailure(subscription.id, invoice);
            }
            else {
                await this.scheduleNextRetry(subscription.id, attemptNumber, opts);
            }
        }
        catch (error) {
            this.logger.error('Error handling payment failure', error, {
                invoiceId: invoice.id
            });
            throw error;
        }
    }
    async retryFailedPayment(subscriptionId, paymentMethodId) {
        try {
            const subscription = await this.prismaService.subscription.findUnique({
                where: { id: subscriptionId },
                include: { User: true }
            });
            if (!subscription || !subscription.stripeSubscriptionId) {
                throw this.errorHandler.createNotFoundError('Subscription', subscriptionId);
            }
            if (paymentMethodId) {
                await this.stripeService.updateSubscription(subscription.stripeSubscriptionId, {
                    default_payment_method: paymentMethodId
                });
            }
            const invoices = await this.stripeService.client.invoices.list({
                subscription: subscription.stripeSubscriptionId,
                status: 'open',
                limit: 1
            });
            if (invoices.data.length === 0) {
                return { success: true, error: 'No open invoices found' };
            }
            const invoice = invoices.data[0];
            if (!invoice || !invoice.id) {
                throw new Error('Invoice ID is missing');
            }
            const paidInvoice = await this.stripeService.client.invoices.pay(invoice.id);
            if (paidInvoice.status === 'paid') {
                await this.updateSubscriptionStatus(subscriptionId, 'ACTIVE');
                this.logger.warn('Payment successful - notification would be sent', {
                    email: subscription.User?.email,
                    name: subscription.User?.name || 'Customer'
                });
                return { success: true };
            }
            else {
                return {
                    success: false,
                    error: `Payment failed with status: ${paidInvoice.status}`
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Payment retry failed';
            this.logger.error('Failed to retry payment', error, { subscriptionId });
            return {
                success: false,
                error: errorMessage
            };
        }
    }
    async getPaymentRetryStatus(subscriptionId) {
        try {
            const subscription = await this.prismaService.subscription.findUnique({
                where: { id: subscriptionId }
            });
            if (!subscription || !subscription.stripeSubscriptionId) {
                throw this.errorHandler.createNotFoundError('Subscription', subscriptionId);
            }
            const invoices = await this.stripeService.client.invoices.list({
                subscription: subscription.stripeSubscriptionId,
                status: 'open',
                limit: 10
            });
            if (invoices.data.length === 0) {
                return {
                    hasFailedPayments: false,
                    attemptCount: 0,
                    canRetry: false
                };
            }
            const latestInvoice = invoices.data[0];
            const attemptCount = latestInvoice?.attempt_count || 0;
            return {
                hasFailedPayments: true,
                lastFailure: latestInvoice?.created ? new Date(latestInvoice.created * 1000) : undefined,
                nextRetry: latestInvoice?.next_payment_attempt
                    ? new Date(latestInvoice.next_payment_attempt * 1000)
                    : undefined,
                attemptCount,
                canRetry: attemptCount < 4 && subscription.status !== 'CANCELED'
            };
        }
        catch (error) {
            this.logger.error('Failed to get payment retry status', error, { subscriptionId });
            throw error;
        }
    }
    async updatePaymentMethodAndRetry(customerId, paymentMethodId) {
        try {
            await this.stripeService.client.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId
                }
            });
            const invoices = await this.stripeService.client.invoices.list({
                customer: customerId,
                status: 'open',
                limit: 100
            });
            let successCount = 0;
            for (const invoice of invoices.data) {
                try {
                    if (!invoice.id) {
                        this.logger.warn('Skipping invoice without ID', { invoiceId: invoice.id });
                        continue;
                    }
                    const paidInvoice = await this.stripeService.client.invoices.pay(invoice.id);
                    if (paidInvoice.status === 'paid') {
                        successCount++;
                    }
                }
                catch (error) {
                    this.logger.warn('Failed to retry invoice payment', {
                        invoiceId: invoice.id,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            return {
                success: successCount > 0,
                retriedInvoices: successCount
            };
        }
        catch (error) {
            this.logger.error('Failed to update payment method and retry', error, {
                customerId
            });
            throw error;
        }
    }
    async getSubscriptionFromInvoice(invoice) {
        const customerId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id;
        if (!customerId)
            return null;
        return await this.prismaService.subscription.findFirst({
            where: { stripeCustomerId: customerId },
            include: { User: true }
        });
    }
    async logPaymentFailure(subscriptionId, invoice) {
        await this.prismaService.paymentFailure.create({
            data: {
                subscriptionId,
                stripeInvoiceId: invoice.id || '',
                amount: invoice.amount_due,
                currency: invoice.currency,
                attemptCount: invoice.attempt_count || 1,
                errorCode: invoice.last_finalization_error?.code,
                errorMessage: invoice.last_finalization_error?.message,
                nextRetryAt: invoice.next_payment_attempt
                    ? new Date(invoice.next_payment_attempt * 1000)
                    : null
            }
        });
    }
    async sendPaymentFailureNotification(userId, attemptNumber, invoice) {
        const user = await this.prismaService.user.findUnique({
            where: { id: userId }
        });
        if (!user)
            return;
        const nextRetry = invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : null;
        this.logger.warn('Payment failure notification would be sent', {
            email: user.email,
            name: user.name || 'Customer',
            attemptNumber,
            nextRetry
        });
    }
    async scheduleNextRetry(subscriptionId, attemptNumber, options) {
        const delayHours = options.retryDelayHours?.[attemptNumber] || 24;
        const nextRetryAt = new Date();
        nextRetryAt.setHours(nextRetryAt.getHours() + delayHours);
        this.logger.log('Scheduling next payment retry', {
            subscriptionId,
            attemptNumber,
            nextRetryAt
        });
        await this.prismaService.paymentFailure.updateMany({
            where: {
                subscriptionId,
                resolved: false
            },
            data: {
                nextRetryAt
            }
        });
    }
    async handleFinalPaymentFailure(subscriptionId, invoice) {
        this.logger.warn('Final payment attempt failed', {
            subscriptionId,
            invoiceId: invoice.id
        });
        await this.updateSubscriptionStatus(subscriptionId, 'PAST_DUE');
        const subscription = await this.prismaService.subscription.findUnique({
            where: { id: subscriptionId },
            include: { User: true }
        });
        if (subscription) {
            this.logger.warn('Subscription suspended notification would be sent', {
                email: subscription.User.email,
                name: subscription.User.name || 'Customer'
            });
        }
        await this.prismaService.paymentFailure.updateMany({
            where: {
                subscriptionId,
                resolved: false
            },
            data: {
                resolved: true,
                resolvedAt: new Date(),
                finalAttempt: true
            }
        });
    }
    async updateSubscriptionStatus(subscriptionId, status) {
        await this.prismaService.subscription.update({
            where: { id: subscriptionId },
            data: { status }
        });
    }
};
exports.PaymentRecoveryService = PaymentRecoveryService;
exports.PaymentRecoveryService = PaymentRecoveryService = PaymentRecoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        error_handler_service_1.ErrorHandlerService])
], PaymentRecoveryService);
