import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter, Gauge, Histogram } from 'prom-client'
import { normalizeHttpRoute } from '../observability/utils/http-route-normalizer'

/**
 * Bounded label values to prevent high cardinality in Prometheus
 *
 * Error types normalized to: VALIDATION_ERROR, DATABASE_ERROR, NETWORK_ERROR,
 * AUTH_ERROR, STRIPE_ERROR, UNKNOWN
 *
 * Auth failure reasons normalized to: INVALID_CREDENTIALS, TOKEN_EXPIRED,
 * TOKEN_INVALID, TOKEN_MISSING, ACCOUNT_LOCKED, ACCOUNT_DISABLED, UNKNOWN
 *
 * Table names normalized to: property, unit, lease, tenants, maintenance_request,
 * rent_payments, users, subscriptions, other
 */

const CORE_TABLE_NAMES = [
	'properties',
	'units',
	'leases',
	'tenants',
	'maintenance_requests',
	'rent_payments',
	'users',
	'subscriptions',
	'other'
] as const

/**
 * Normalize error types to prevent unbounded cardinality
 */
function normalizeErrorType(errorType: string): string {
	const upper = errorType.toUpperCase()
	if (upper.includes('VALIDATION')) return 'VALIDATION_ERROR'
	if (upper.includes('DATABASE') || upper.includes('SQL'))
		return 'DATABASE_ERROR'
	if (upper.includes('NETWORK') || upper.includes('TIMEOUT'))
		return 'NETWORK_ERROR'
	if (upper.includes('AUTH') || upper.includes('UNAUTHORIZED'))
		return 'AUTH_ERROR'
	if (upper.includes('STRIPE') || upper.includes('PAYMENT'))
		return 'STRIPE_ERROR'
	return 'UNKNOWN'
}

/**
 * Normalize auth failure reasons to prevent unbounded cardinality
 */
function normalizeAuthFailureReason(reason: string): string {
	const upper = reason.toUpperCase()
	if (
		upper.includes('CREDENTIAL') ||
		upper.includes('PASSWORD') ||
		upper.includes('INVALID')
	)
		return 'INVALID_CREDENTIALS'
	if (upper.includes('expired')) return 'TOKEN_EXPIRED'
	if (upper.includes('MALFORMED') || upper.includes('DECODE'))
		return 'TOKEN_INVALID'
	if (upper.includes('MISSING') || upper.includes('NOT FOUND'))
		return 'TOKEN_MISSING'
	if (upper.includes('LOCKED')) return 'ACCOUNT_LOCKED'
	if (upper.includes('DISABLED') || upper.includes('inactive'))
		return 'ACCOUNT_DISABLED'
	return 'UNKNOWN'
}

/**
 * Normalize table names to core entities to prevent unbounded cardinality
 */
function normalizeTableName(tableName: string): string {
	const lower = tableName.toLowerCase()
	if (CORE_TABLE_NAMES.includes(lower as (typeof CORE_TABLE_NAMES)[number])) {
		return lower
	}
	return 'other'
}

/**
 * Metrics Service - Centralized Prometheus metrics for TenantFlow
 *
 * Follows NestJS + Prometheus best practices:
 * - All metrics prefixed with 'tenantflow_'
 * - Counter for incrementing values (events, requests)
 * - Gauge for point-in-time values (active connections, queue size)
 * - Histogram for distributions (response times, request sizes)
 * - Bounded label values to prevent high cardinality
 *
 * Metrics exposed at /metrics endpoint
 */
@Injectable()
export class MetricsService {
	constructor(
		@InjectMetric('tenantflow_stripe_webhooks_received_total')
		private stripeWebhooksReceivedCounter: Counter<string>,
		@InjectMetric('tenantflow_stripe_webhooks_processed_total')
		private stripeWebhooksProcessedCounter: Counter<string>,
		@InjectMetric('tenantflow_stripe_webhooks_failed_total')
		private stripeWebhooksFailedCounter: Counter<string>,
		@InjectMetric('tenantflow_stripe_webhooks_dlq_total')
		private stripeWebhooksDlqCounter: Counter<string>,
		@InjectMetric('tenantflow_stripe_webhook_processing_duration_seconds')
		private stripeWebhookDurationHistogram: Histogram<string>,
		@InjectMetric('tenantflow_active_subscriptions')
		private activeSubscriptionsGauge: Gauge<string>,
		@InjectMetric('tenantflow_subscription_changes_total')
		private subscriptionChangesCounter: Counter<string>,
		@InjectMetric('tenantflow_database_operations_total')
		private databaseOperationsCounter: Counter<string>,
		@InjectMetric('tenantflow_database_errors_total')
		private databaseErrorsCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_rpc_calls_total')
		private supabaseRpcCallsCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_rpc_duration_seconds')
		private supabaseRpcDurationHistogram: Histogram<string>,
		@InjectMetric('tenantflow_supabase_rpc_cache_hits_total')
		private supabaseRpcCacheHitsCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_rpc_cache_misses_total')
		private supabaseRpcCacheMissesCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_nplusone_detected_total')
		private nPlusOneDetectedCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_user_client_pool_hits_total')
		private supabaseUserClientPoolHitsCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_user_client_pool_misses_total')
		private supabaseUserClientPoolMissesCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_user_client_pool_evictions_total')
		private supabaseUserClientPoolEvictionsCounter: Counter<string>,
		@InjectMetric('tenantflow_supabase_user_client_pool_size')
		private supabaseUserClientPoolSizeGauge: Gauge<string>,
		@InjectMetric('tenantflow_auth_attempts_total')
		private authAttemptsCounter: Counter<string>,
		@InjectMetric('tenantflow_auth_success_total')
		private authSuccessCounter: Counter<string>,
		@InjectMetric('tenantflow_auth_failures_total')
		private authFailuresCounter: Counter<string>,
		@InjectMetric('tenantflow_http_requests_total')
		private httpRequestsCounter: Counter<string>,
		@InjectMetric('tenantflow_http_request_duration_seconds')
		private httpRequestDurationHistogram: Histogram<string>
	) {}

	// Stripe webhook metric methods
	recordStripeWebhookReceived(eventType: string): void {
		this.stripeWebhooksReceivedCounter.inc({ event_type: eventType })
	}

	recordStripeWebhookProcessed(eventType: string): void {
		this.stripeWebhooksProcessedCounter.inc({ event_type: eventType })
	}

	recordStripeWebhookFailed(eventType: string, errorType: string): void {
		this.stripeWebhooksFailedCounter.inc({
			event_type: eventType,
			error_type: normalizeErrorType(errorType)
		})
	}

	recordStripeWebhookDlq(eventType: string): void {
		this.stripeWebhooksDlqCounter.inc({ event_type: eventType })
	}

	recordStripeWebhookDuration(
		eventType: string,
		status: 'success' | 'failure',
		durationMs: number
	): void {
		this.stripeWebhookDurationHistogram.observe(
			{ event_type: eventType, status },
			Math.max(durationMs, 0) / 1000
		)
	}

	// Subscription metric methods
	setActiveSubscriptions(planType: string, count: number): void {
		this.activeSubscriptionsGauge.set({ plan_type: planType }, count)
	}

	recordSubscriptionChange(
		changeType: string,
		fromPlan: string,
		toPlan: string
	): void {
		this.subscriptionChangesCounter.inc({
			change_type: changeType,
			from_plan: fromPlan,
			to_plan: toPlan
		})
	}

	// Database metric methods
	recordDatabaseOperation(operationType: string, tableName: string): void {
		this.databaseOperationsCounter.inc({
			operation_type: operationType,
			table_name: normalizeTableName(tableName)
		})
	}

	recordDatabaseError(errorType: string, tableName: string): void {
		this.databaseErrorsCounter.inc({
			error_type: normalizeErrorType(errorType),
			table_name: normalizeTableName(tableName)
		})
	}

	recordSupabaseRpcCall(
		functionName: string,
		durationMs: number,
		status: 'success' | 'error' | 'cache'
	): void {
		const normalized = this.normalizeFunctionName(functionName)
		this.supabaseRpcCallsCounter.inc({
			function_name: normalized,
			status
		})
		if (status !== 'cache') {
			this.supabaseRpcDurationHistogram.observe(
				{ function_name: normalized },
				Math.max(durationMs, 0) / 1000
			)
		}
	}

	recordSupabaseRpcCacheHit(functionName: string): void {
		this.supabaseRpcCacheHitsCounter.inc({
			function_name: this.normalizeFunctionName(functionName)
		})
	}

	recordSupabaseRpcCacheMiss(functionName: string): void {
		this.supabaseRpcCacheMissesCounter.inc({
			function_name: this.normalizeFunctionName(functionName)
		})
	}

	recordNPlusOneDetection(type: string, signature: string): void {
		this.nPlusOneDetectedCounter.inc({
			type,
			signature: this.normalizeSignature(signature)
		})
	}

	recordSupabaseUserClientPoolHits(count = 1): void {
		this.supabaseUserClientPoolHitsCounter.inc({ pool: 'user' }, count)
	}

	recordSupabaseUserClientPoolMisses(count = 1): void {
		this.supabaseUserClientPoolMissesCounter.inc({ pool: 'user' }, count)
	}

	recordSupabaseUserClientPoolEvictions(count = 1): void {
		this.supabaseUserClientPoolEvictionsCounter.inc({ pool: 'user' }, count)
	}

	setSupabaseUserClientPoolSize(size: number): void {
		this.supabaseUserClientPoolSizeGauge.set({ pool: 'user' }, size)
	}

	// Authentication metric methods
	recordAuthAttempt(method: string): void {
		this.authAttemptsCounter.inc({ method })
	}

	recordAuthSuccess(method: string): void {
		this.authSuccessCounter.inc({ method })
	}

	recordAuthFailure(method: string, reason: string): void {
		this.authFailuresCounter.inc({
			method,
			reason: normalizeAuthFailureReason(reason)
		})
	}

	// HTTP metrics
	recordHttpRequest(
		method: string,
		route: string,
		statusCode: number,
		durationMs: number
	): void {
		const normalizedRoute = normalizeHttpRoute(route)
		const normalizedMethod = method?.toUpperCase?.() ?? 'UNKNOWN'
		this.httpRequestsCounter.inc({
			method: normalizedMethod,
			route: normalizedRoute,
			status: Number.isFinite(statusCode) ? statusCode.toString() : '0'
		})
		this.httpRequestDurationHistogram.observe(
			{ method: normalizedMethod, route: normalizedRoute },
			Math.max(durationMs, 0) / 1000
		)
	}

	private normalizeFunctionName(functionName: string): string {
		const normalized = functionName?.trim()
		if (!normalized) return 'unknown'
		if (normalized.length > 64) {
			return normalized.slice(0, 64)
		}
		return normalized
	}

	private normalizeSignature(signature: string): string {
		const normalized = signature?.trim()
		if (!normalized) return 'unknown'
		return normalized.length > 96 ? normalized.slice(0, 96) : normalized
	}
}
