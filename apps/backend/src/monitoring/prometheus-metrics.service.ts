import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as client from 'prom-client'

@Injectable()
export class PrometheusMetricsService implements OnModuleInit {
	private readonly logger = new Logger(PrometheusMetricsService.name)
	private readonly isEnabled: boolean

	// Payment-related metrics
	private paymentAttempts!: client.Counter<string>
	private paymentSuccesses!: client.Counter<string>
	private paymentFailures!: client.Counter<string>
	private paymentDuration!: client.Histogram<string>
	private paymentAmount!: client.Histogram<string>

	// Subscription-related metrics
	private subscriptionCreated!: client.Counter<string>
	private subscriptionCanceled!: client.Counter<string>
	private subscriptionTrialConversions!: client.Counter<string>
	private activeSubscriptions!: client.Gauge<string>
	private monthlyRecurringRevenue!: client.Gauge<string>

	// Webhook-related metrics
	private webhookEvents!: client.Counter<string>
	private webhookProcessingDuration!: client.Histogram<string>
	private webhookFailures!: client.Counter<string>

	// Business metrics
	private revenue!: client.Counter<string>
	private churnRate!: client.Gauge<string>
	private customerLifetimeValue!: client.Histogram<string>

	constructor(private readonly configService: ConfigService) {
		this.isEnabled = this.configService.get<boolean>(
			'PROMETHEUS_METRICS_ENABLED',
			true
		)
	}

	onModuleInit() {
		if (!this.isEnabled) {
			this.logger.log('Prometheus metrics disabled')
			return
		}

		// Initialize default metrics
		client.collectDefaultMetrics({
			prefix: 'tenantflow_',
			gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
		})

		this.initializeMetrics()
		this.logger.log('Prometheus metrics initialized')
	}

	private initializeMetrics(): void {
		// Payment metrics
		this.paymentAttempts = new client.Counter({
			name: 'tenantflow_payment_attempts_total',
			help: 'Total number of payment attempts',
			labelNames: ['payment_type', 'currency', 'status']
		})

		this.paymentSuccesses = new client.Counter({
			name: 'tenantflow_payment_successes_total',
			help: 'Total number of successful payments',
			labelNames: ['payment_type', 'currency', 'plan_type']
		})

		this.paymentFailures = new client.Counter({
			name: 'tenantflow_payment_failures_total',
			help: 'Total number of failed payments',
			labelNames: ['payment_type', 'currency', 'error_type', 'plan_type']
		})

		this.paymentDuration = new client.Histogram({
			name: 'tenantflow_payment_duration_seconds',
			help: 'Duration of payment processing',
			labelNames: ['payment_type', 'status'],
			buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
		})

		this.paymentAmount = new client.Histogram({
			name: 'tenantflow_payment_amount_usd',
			help: 'Payment amounts in USD',
			labelNames: ['payment_type', 'plan_type'],
			buckets: [1, 5, 10, 25, 50, 100, 200, 500, 1000, 2000]
		})

		// Subscription metrics
		this.subscriptionCreated = new client.Counter({
			name: 'tenantflow_subscriptions_created_total',
			help: 'Total number of subscriptions created',
			labelNames: ['plan_type', 'trial']
		})

		this.subscriptionCanceled = new client.Counter({
			name: 'tenantflow_subscriptions_canceled_total',
			help: 'Total number of subscriptions canceled',
			labelNames: ['plan_type', 'cancel_reason']
		})

		this.subscriptionTrialConversions = new client.Counter({
			name: 'tenantflow_trial_conversions_total',
			help: 'Total number of trial conversions to paid subscriptions',
			labelNames: ['plan_type']
		})

		this.activeSubscriptions = new client.Gauge({
			name: 'tenantflow_active_subscriptions',
			help: 'Current number of active subscriptions',
			labelNames: ['plan_type']
		})

		this.monthlyRecurringRevenue = new client.Gauge({
			name: 'tenantflow_mrr_usd',
			help: 'Monthly Recurring Revenue in USD',
			labelNames: ['plan_type']
		})

		// Webhook metrics
		this.webhookEvents = new client.Counter({
			name: 'tenantflow_webhook_events_total',
			help: 'Total number of webhook events received',
			labelNames: ['event_type', 'status']
		})

		this.webhookProcessingDuration = new client.Histogram({
			name: 'tenantflow_webhook_processing_duration_seconds',
			help: 'Duration of webhook event processing',
			labelNames: ['event_type', 'status'],
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
		})

		this.webhookFailures = new client.Counter({
			name: 'tenantflow_webhook_failures_total',
			help: 'Total number of webhook processing failures',
			labelNames: ['event_type', 'error_type']
		})

		// Business metrics
		this.revenue = new client.Counter({
			name: 'tenantflow_revenue_total_usd',
			help: 'Total revenue generated in USD',
			labelNames: ['plan_type', 'payment_type']
		})

		this.churnRate = new client.Gauge({
			name: 'tenantflow_churn_rate_percent',
			help: 'Monthly churn rate percentage',
			labelNames: ['plan_type']
		})

		this.customerLifetimeValue = new client.Histogram({
			name: 'tenantflow_customer_lifetime_value_usd',
			help: 'Customer lifetime value in USD',
			labelNames: ['plan_type'],
			buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
		})
	}

	// Payment tracking methods
	recordPaymentAttempt(
		paymentType: string,
		currency: string,
		status: string
	): void {
		if (!this.isEnabled) {
			return
		}
		this.paymentAttempts?.labels(paymentType, currency, status).inc()
	}

	recordPaymentSuccess(
		paymentType: string,
		currency: string,
		planType: string,
		amount: number,
		duration: number
	): void {
		if (!this.isEnabled) {
			return
		}
		this.paymentSuccesses?.labels(paymentType, currency, planType).inc()
		this.paymentDuration?.labels(paymentType, 'success').observe(duration)
		this.paymentAmount?.labels(paymentType, planType).observe(amount)
		this.revenue?.labels(planType, paymentType).inc(amount)
	}

	recordPaymentFailure(
		paymentType: string,
		currency: string,
		errorType: string,
		planType: string,
		duration: number
	): void {
		if (!this.isEnabled) {
			return
		}
		this.paymentFailures
			?.labels(paymentType, currency, errorType, planType)
			.inc()
		this.paymentDuration?.labels(paymentType, 'failure').observe(duration)
	}

	// Subscription tracking methods
	recordSubscriptionCreated(planType: string, hasTrial: boolean): void {
		if (!this.isEnabled) {
			return
		}
		this.subscriptionCreated?.labels(planType, hasTrial.toString()).inc()
	}

	recordSubscriptionCanceled(planType: string, cancelReason: string): void {
		if (!this.isEnabled) {
			return
		}
		this.subscriptionCanceled?.labels(planType, cancelReason).inc()
	}

	recordTrialConversion(planType: string): void {
		if (!this.isEnabled) {
			return
		}
		this.subscriptionTrialConversions?.labels(planType).inc()
	}

	updateActiveSubscriptions(planType: string, count: number): void {
		if (!this.isEnabled) {
			return
		}
		this.activeSubscriptions?.labels(planType).set(count)
	}

	updateMonthlyRecurringRevenue(planType: string, mrr: number): void {
		if (!this.isEnabled) {
			return
		}
		this.monthlyRecurringRevenue?.labels(planType).set(mrr)
	}

	// Webhook tracking methods
	recordWebhookEvent(
		eventType: string,
		status: string,
		duration: number
	): void {
		if (!this.isEnabled) {
			return
		}
		this.webhookEvents?.labels(eventType, status).inc()
		this.webhookProcessingDuration
			?.labels(eventType, status)
			.observe(duration)
	}

	recordWebhookFailure(eventType: string, errorType: string): void {
		if (!this.isEnabled) {
			return
		}
		this.webhookFailures?.labels(eventType, errorType).inc()
	}

	// Business metrics methods
	updateChurnRate(planType: string, rate: number): void {
		if (!this.isEnabled) {
			return
		}
		this.churnRate?.labels(planType).set(rate)
	}

	recordCustomerLifetimeValue(planType: string, value: number): void {
		if (!this.isEnabled) {
			return
		}
		this.customerLifetimeValue?.labels(planType).observe(value)
	}

	// Get metrics for /metrics endpoint
	async getMetrics(): Promise<string> {
		if (!this.isEnabled) {
			return ''
		}
		return client.register.metrics()
	}

	// Reset metrics (useful for testing)
	resetMetrics(): void {
		if (!this.isEnabled) {
			return
		}
		client.register.clear()
		this.initializeMetrics()
	}

	// Get specific metric for health checks
	getMetric(name: string): client.Metric<string> | undefined {
		if (!this.isEnabled) {
			return undefined
		}
		return client.register.getSingleMetric(name)
	}
}
