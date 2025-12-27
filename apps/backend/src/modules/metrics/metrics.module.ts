import { Module } from '@nestjs/common'
import {
	makeCounterProvider,
	makeGaugeProvider,
	makeHistogramProvider
} from '@willsoto/nestjs-prometheus'
import { MetricsService } from './metrics.service'
import { MetricsController } from './metrics.controller'
import { ConfigModule } from '@nestjs/config'

@Module({
	imports: [ConfigModule],
	controllers: [MetricsController],
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
		makeCounterProvider({
			name: 'tenantflow_supabase_rpc_calls_total',
			help: 'Total number of Supabase RPC calls',
			labelNames: ['function_name', 'status']
		}),
		makeHistogramProvider({
			name: 'tenantflow_supabase_rpc_duration_seconds',
			help: 'Supabase RPC duration in seconds',
			labelNames: ['function_name'],
			buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_rpc_cache_hits_total',
			help: 'Total number of Supabase RPC cache hits',
			labelNames: ['function_name']
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_rpc_cache_misses_total',
			help: 'Total number of Supabase RPC cache misses',
			labelNames: ['function_name']
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_nplusone_detected_total',
			help: 'Total number of potential N+1 query patterns detected',
			labelNames: ['type', 'signature']
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_user_client_pool_hits_total',
			help: 'Supabase user client pool cache hits',
			labelNames: ['pool']
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_user_client_pool_misses_total',
			help: 'Supabase user client pool cache misses',
			labelNames: ['pool']
		}),
		makeCounterProvider({
			name: 'tenantflow_supabase_user_client_pool_evictions_total',
			help: 'Supabase user client pool evictions',
			labelNames: ['pool']
		}),
		makeGaugeProvider({
			name: 'tenantflow_supabase_user_client_pool_size',
			help: 'Supabase user client pool size',
			labelNames: ['pool']
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
