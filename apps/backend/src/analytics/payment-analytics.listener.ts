import { Injectable } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PostHogAnalyticsService } from './posthog-analytics.service'

interface PaymentChargeEventPayload {
	refundId: string | null
	paymentId: string
	customerId: string
	amount: number
	currency: string
}

interface PaymentFailedEventPayload {
	paymentId: string
	customerId: string
	error: string
}

interface SubscriptionEventPayload {
	paymentId: string | null
	error: string | null
	invoiceId: string | null
	amount: number | null
	currency: string | null
	userId: string
	planType: string | null
	trialEnd: Date | null
	cancelReason: string
	canceledAt: Date | null
	trialEndDate: Date | null
	hasPaymentMethod: boolean
	metadata: Record<string, unknown>
	templateData: Record<string, unknown>
	churnReason: string | null
	subscriptionId: string
	customerId: string
	status: string
	currentPeriodEnd?: string
}

@Injectable()
export class PaymentAnalyticsListener {
	constructor(private readonly analytics: PostHogAnalyticsService) {}

	// Payment Charge Events
	@OnEvent('payment.charge.succeeded')
	async handlePaymentChargeSucceeded(
		payload: PaymentChargeEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'payment_charge_succeeded',
			properties: {
				payment_id: payload.paymentId,
				amount: payload.amount,
				currency: payload.currency,
				payment_method: 'stripe'
			}
		})

		// Track revenue
		await this.analytics.trackRevenue(
			payload.customerId,
			payload.amount / 100,
			payload.currency
		)

		// Track payment funnel completion
		await this.analytics.trackPaymentFunnel(
			payload.customerId,
			'completed',
			{
				payment_id: payload.paymentId,
				amount: payload.amount,
				currency: payload.currency
			}
		)
	}

	@OnEvent('payment.charge.failed')
	async handlePaymentChargeFailed(
		payload: PaymentFailedEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'payment_charge_failed',
			properties: {
				payment_id: payload.paymentId,
				error: payload.error,
				payment_method: 'stripe'
			}
		})

		// Track payment funnel failure
		await this.analytics.trackPaymentFunnel(payload.customerId, 'failed', {
			payment_id: payload.paymentId,
			error: payload.error
		})
	}

	// Payment Refund Events
	@OnEvent('payment.refund.succeeded')
	async handlePaymentRefundSucceeded(
		payload: PaymentChargeEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'payment_refund_succeeded',
			properties: {
				payment_id: payload.paymentId,
				refund_id: payload.refundId,
				amount: payload.amount,
				currency: payload.currency,
				payment_method: 'stripe'
			}
		})
	}

	@OnEvent('payment.refund.failed')
	async handlePaymentRefundFailed(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'payment_refund_failed',
			properties: {
				payment_id: payload.paymentId,
				error: payload.error,
				payment_method: 'stripe'
			}
		})
	}

	// Subscription Payment Events
	@OnEvent('payment.subscription.succeeded')
	async handleSubscriptionPaymentSucceeded(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackSubscriptionEvent({
			userId: payload.customerId,
			subscriptionId: payload.subscriptionId,
			event: 'subscription_payment_succeeded',
			properties: {
				subscription_status: payload.status,
				current_period_end: payload.currentPeriodEnd,
				payment_method: 'stripe'
			}
		})

		// Track subscription funnel renewal
		await this.analytics.trackSubscriptionFunnel(
			payload.customerId,
			payload.subscriptionId,
			'renewed',
			{
				subscription_status: payload.status,
				current_period_end: payload.currentPeriodEnd
			}
		)
	}

	@OnEvent('payment.subscription.failed')
	async handleSubscriptionPaymentFailed(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackSubscriptionEvent({
			userId: payload.customerId,
			subscriptionId: payload.subscriptionId,
			event: 'subscription_payment_failed',
			properties: {
				error: payload.error,
				payment_method: 'stripe'
			}
		})

		// Track subscription funnel failure
		await this.analytics.trackSubscriptionFunnel(
			payload.customerId,
			payload.subscriptionId,
			'payment_failed',
			{
				error: payload.error
			}
		)
	}

	// Invoice Payment Events
	@OnEvent('payment.invoice.succeeded')
	async handleInvoicePaymentSucceeded(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'invoice_payment_succeeded',
			properties: {
				invoice_id: payload.invoiceId,
				subscription_id: payload.subscriptionId,
				amount: payload.amount,
				currency: payload.currency,
				payment_method: 'stripe'
			}
		})

		// Track revenue from invoice
		await this.analytics.trackRevenue(
			payload.customerId,
			(payload.amount ?? 0) / 100,
			payload.currency ?? 'usd',
			{
				invoice_id: payload.invoiceId,
				subscription_id: payload.subscriptionId
			}
		)
	}

	@OnEvent('payment.invoice.failed')
	async handleInvoicePaymentFailed(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.customerId,
			event: 'invoice_payment_failed',
			properties: {
				invoice_id: payload.invoiceId,
				error: payload.error,
				payment_method: 'stripe'
			}
		})
	}

	// Subscription Lifecycle Events (from webhook.service.ts)
	@OnEvent('subscription.created')
	async handleSubscriptionCreated(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackSubscriptionEvent({
			userId: payload.userId,
			subscriptionId: payload.subscriptionId,
			event: 'subscription_created',
			properties: {
				plan_type: payload.planType,
				subscription_status: payload.status,
				trial_end: payload.trialEnd,
				created_via: 'stripe_webhook'
			}
		})

		// Track subscription funnel start
		await this.analytics.trackSubscriptionFunnel(
			payload.userId,
			payload.subscriptionId,
			'created',
			{
				plan_type: payload.planType,
				subscription_status: payload.status
			}
		)
	}

	@OnEvent('subscription.canceled')
	async handleSubscriptionCanceled(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackSubscriptionEvent({
			userId: payload.userId,
			subscriptionId: payload.subscriptionId,
			event: 'subscription_canceled',
			properties: {
				plan_type: payload.planType,
				cancel_reason: payload.cancelReason || 'user_requested',
				canceled_at: payload.canceledAt,
				created_via: 'stripe_webhook'
			}
		})

		// Track churn
		await this.analytics.trackChurn(
			payload.userId,
			payload.subscriptionId,
			payload.cancelReason || 'user_requested',
			{
				plan_type: payload.planType,
				canceled_at: payload.canceledAt
			}
		)

		// Track subscription funnel churn
		await this.analytics.trackSubscriptionFunnel(
			payload.userId,
			payload.subscriptionId,
			'churned',
			{
				plan_type: payload.planType,
				cancel_reason: payload.cancelReason || 'user_requested'
			}
		)
	}

	@OnEvent('subscription.trial_will_end')
	async handleTrialWillEnd(payload: SubscriptionEventPayload): Promise<void> {
		await this.analytics.trackSubscriptionEvent({
			userId: payload.userId,
			subscriptionId: payload.subscriptionId,
			event: 'subscription_trial_will_end',
			properties: {
				plan_type: payload.planType,
				trial_end_date: payload.trialEndDate,
				has_payment_method: payload.hasPaymentMethod,
				created_via: 'stripe_webhook'
			}
		})

		// Track subscription funnel trial conversion opportunity
		await this.analytics.trackSubscriptionFunnel(
			payload.userId,
			payload.subscriptionId,
			'trial_ending',
			{
				plan_type: payload.planType,
				has_payment_method: payload.hasPaymentMethod
			}
		)
	}

	// Payment Method Events
	@OnEvent('payment.method_required')
	async handlePaymentMethodRequired(
		payload: SubscriptionEventPayload
	): Promise<void> {
		await this.analytics.trackPaymentEvent({
			userId: payload.userId,
			event: 'payment_method_required',
			properties: {
				subscription_id: payload.metadata?.subscriptionId,
				plan_type: payload.templateData?.planType,
				trial_end_date: payload.templateData?.trialEndDate,
				source: payload.metadata?.source
			}
		})
	}

	// User Identification Events
	@OnEvent('user.subscribed')
	async handleUserSubscribed(
		payload: SubscriptionEventPayload
	): Promise<void> {
		// Identify user with subscription properties for cohort analysis
		await this.analytics.identifyUser(payload.userId, {
			subscription_status: 'active',
			plan_type: payload.planType,
			subscribed_at: new Date().toISOString(),
			subscription_id: payload.subscriptionId
		})
	}

	@OnEvent('user.churned')
	async handleUserChurned(payload: SubscriptionEventPayload): Promise<void> {
		// Update user identification with churn properties
		await this.analytics.identifyUser(payload.userId, {
			subscription_status: 'churned',
			churned_at: new Date().toISOString(),
			churn_reason: payload.churnReason,
			last_subscription_id: payload.subscriptionId
		})
	}
}
