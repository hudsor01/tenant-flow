import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import {
	Registry,
	Counter,
	Histogram,
	Gauge,
	collectDefaultMetrics
} from 'prom-client'
import {
	MODULE_OPTIONS_TOKEN,
	type PrometheusModuleOptions
} from './prometheus.module-definition'
import { normalizeHttpRoute } from './utils/http-route-normalizer'

/**
 * Normalize error types to prevent unbounded cardinality in Prometheus metrics
 * Maps error constructor names to 7 categories + UNKNOWN
 */
function normalizeErrorType(errorType: string): string {
	const upper = errorType.toUpperCase()
	if (upper.includes('VALIDATION')) return 'VALIDATION_ERROR'
	if (upper.includes('DATABASE') || upper.includes('SQL')) return 'DATABASE_ERROR'
	if (upper.includes('NETWORK') || upper.includes('TIMEOUT')) return 'NETWORK_ERROR'
	if (upper.includes('AUTH') || upper.includes('UNAUTHORIZED')) return 'AUTH_ERROR'
	if (upper.includes('STRIPE') || upper.includes('PAYMENT')) return 'STRIPE_ERROR'
	if (upper.includes('PDF') || upper.includes('TEMPLATE')) return 'PDF_ERROR'
	return 'UNKNOWN'
}

@Injectable()
export class PrometheusService implements OnModuleInit {
	private readonly registry: Registry
	private readonly prefix: string

	// Stripe webhook metrics
	readonly webhookReceived: Counter<'event_type' | 'status'>
	readonly webhookDuration: Histogram<'event_type'>
	readonly webhookRetries: Counter<'event_type' | 'attempt'>
	readonly webhookFailures: Counter<'event_type' | 'error_type'>
	readonly idempotencyHits: Counter<'event_type'>

	// HTTP metrics (for general API observability)
	readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>
	readonly httpRequestDuration: Histogram<'method' | 'route'>

	// Database connection pool metrics
	readonly dbConnectionsActive: Gauge
	readonly dbConnectionsIdle: Gauge

	constructor(
		@Inject(MODULE_OPTIONS_TOKEN)
		private readonly options: PrometheusModuleOptions
	) {
		this.registry = new Registry()
		this.prefix = options.prefix || 'tenantflow'

		// Initialize Stripe webhook metrics
		this.webhookReceived = new Counter({
			name: `${this.prefix}_stripe_webhooks_received_total`,
			help: 'Total number of Stripe webhooks received',
			labelNames: ['event_type', 'status'],
			registers: [this.registry]
		})

		this.webhookDuration = new Histogram({
			name: `${this.prefix}_stripe_webhook_processing_duration_seconds`,
			help: 'Stripe webhook processing duration in seconds',
			labelNames: ['event_type'],
			buckets: [0.1, 0.5, 1, 2, 5, 10], // 100ms to 10s
			registers: [this.registry]
		})

		this.webhookRetries = new Counter({
			name: `${this.prefix}_stripe_webhook_retries_total`,
			help: 'Total number of webhook retry attempts',
			labelNames: ['event_type', 'attempt'],
			registers: [this.registry]
		})

		this.webhookFailures = new Counter({
			name: `${this.prefix}_stripe_webhook_failures_total`,
			help: 'Total number of webhook failures',
			labelNames: ['event_type', 'error_type'],
			registers: [this.registry]
		})

		this.idempotencyHits = new Counter({
			name: `${this.prefix}_stripe_idempotency_hits_total`,
			help: 'Total number of duplicate webhook events prevented',
			labelNames: ['event_type'],
			registers: [this.registry]
		})

		// HTTP metrics
		this.httpRequestsTotal = new Counter({
			name: `${this.prefix}_http_requests_total`,
			help: 'Total HTTP requests',
			labelNames: ['method', 'route', 'status'],
			registers: [this.registry]
		})

		this.httpRequestDuration = new Histogram({
			name: `${this.prefix}_http_request_duration_seconds`,
			help: 'HTTP request duration in seconds',
			labelNames: ['method', 'route'],
			buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
			registers: [this.registry]
		})

		// Database metrics
		this.dbConnectionsActive = new Gauge({
			name: `${this.prefix}_db_connections_active`,
			help: 'Number of active database connections',
			registers: [this.registry]
		})

		this.dbConnectionsIdle = new Gauge({
			name: `${this.prefix}_db_connections_idle`,
			help: 'Number of idle database connections',
			registers: [this.registry]
		})
	}

	onModuleInit() {
		// Enable default metrics (CPU, memory, event loop, etc.)
		if (this.options.enableDefaultMetrics !== false) {
			collectDefaultMetrics({
				register: this.registry,
				prefix: `${this.prefix}_`
			})
		}
	}

	/**
	 * Get all metrics in Prometheus format
	 */
	async getMetrics(): Promise<string> {
		return this.registry.metrics()
	}

	/**
	 * Get metrics content type
	 */
	getContentType(): string {
		return this.registry.contentType
	}

	/**
	 * Record webhook processing
	 */
	recordWebhookProcessing(
		eventType: string,
		durationMs: number,
		status: 'success' | 'error'
	): void {
		this.webhookReceived.inc({ event_type: eventType, status })
		this.webhookDuration.observe({ event_type: eventType }, durationMs / 1000)
	}

	/**
	 * Record webhook retry
	 */
	recordWebhookRetry(eventType: string, attemptNumber: number): void {
		this.webhookRetries.inc({
			event_type: eventType,
			attempt: attemptNumber.toString()
		})
	}

	/**
	 * Record webhook failure
	 */
	recordWebhookFailure(eventType: string, errorType: string): void {
		const normalizedErrorType = normalizeErrorType(errorType)
		this.webhookFailures.inc({ event_type: eventType, error_type: normalizedErrorType })
	}

	/**
	 * Record idempotency hit (duplicate event)
	 */
	recordIdempotencyHit(eventType: string): void {
		this.idempotencyHits.inc({ event_type: eventType })
	}

	/**
	 * Record HTTP request
	 */
	recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		durationMs: number
	): void {
		const normalizedRoute = normalizeHttpRoute(route)
		this.httpRequestsTotal.inc({
			method,
			route: normalizedRoute,
			status: statusCode.toString()
		})
		this.httpRequestDuration.observe({ method, route: normalizedRoute }, durationMs / 1000)
	}

	/**
	 * Update database connection metrics
	 */
	updated_atabaseMetrics(active: number, idle: number): void {
		this.dbConnectionsActive.set(active)
		this.dbConnectionsIdle.set(idle)
	}
}
