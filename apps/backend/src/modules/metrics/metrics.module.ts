import { Module } from '@nestjs/common'
import {
	makeCounterProvider,
	makeGaugeProvider,
	makeHistogramProvider
} from '@willsoto/nestjs-prometheus'
import { MetricsService } from './metrics.service'
import { ConfigModule } from '@nestjs/config'

@Module({
	imports: [ConfigModule],
	controllers: [],
	providers: [
		// Stripe webhook metrics
		makeCounterProvider({
			name: 'tenantflow_stripe_webhooks_received_total',
			help: 'Total number of Stripe webhook events received',
			labelNames: ['event_type']
		}),
		makeCounterProvider({
			name: 'tenantflow_stripe_webhooks_processed_total',
			help: 'Total number of Stripe webhook events successfully processed',
			labelNames: ['event_type']
		}),
		makeCounterProvider({
			name: 'tenantflow_stripe_webhooks_failed_total',
			help: 'Total number of Stripe webhook events that failed processing',
			labelNames: ['event_type', 'error_type']
		}),

		// Subscription metrics
		makeGaugeProvider({
			name: 'tenantflow_active_subscriptions',
			help: 'Current number of active subscriptions',
			labelNames: ['plan_type']
		}),
		makeCounterProvider({
			name: 'tenantflow_subscription_changes_total',
			help: 'Total number of subscription changes',
			labelNames: ['change_type', 'from_plan', 'to_plan']
		}),

		// Database operation metrics
		makeCounterProvider({
			name: 'tenantflow_database_operations_total',
			help: 'Total number of database operations',
			labelNames: ['operation_type', 'table_name']
		}),
		makeCounterProvider({
			name: 'tenantflow_database_errors_total',
			help: 'Total number of database errors',
			labelNames: ['error_type', 'table_name']
		}),

		// Authentication metrics
		makeCounterProvider({
			name: 'tenantflow_auth_attempts_total',
			help: 'Total number of authentication attempts',
			labelNames: ['method']
		}),
		makeCounterProvider({
			name: 'tenantflow_auth_success_total',
			help: 'Total number of successful authentications',
			labelNames: ['method']
		}),
		makeCounterProvider({
			name: 'tenantflow_auth_failures_total',
			help: 'Total number of failed authentications',
			labelNames: ['method', 'reason']
		}),
		// HTTP metrics
		makeCounterProvider({
			name: 'tenantflow_http_requests_total',
			help: 'Total number of HTTP requests handled',
			labelNames: ['method', 'route', 'status']
		}),
		makeHistogramProvider({
			name: 'tenantflow_http_request_duration_seconds',
			help: 'HTTP request duration in seconds',
			labelNames: ['method', 'route'],
			buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]
		}),

		MetricsService
	],
	exports: [MetricsService]
})
export class MetricsModule {}
