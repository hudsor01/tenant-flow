import { CacheModule } from '@nestjs/cache-manager'
import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import type { Request } from 'express'
import { ClsModule } from 'nestjs-cls'
import { ZodValidationPipe } from 'nestjs-zod'
import { randomUUID } from 'node:crypto'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { validate } from './config/config.schema'
import { SupabaseModule } from './database/supabase.module'
import { HealthModule } from './health/health.module'
import { CacheControlInterceptor } from './interceptors/cache-control.interceptor'
import { TimeoutInterceptor } from './interceptors/timeout.interceptor'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { StripeModule } from './modules/billing/stripe.module'
import { ContactModule } from './modules/contact/contact.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { FAQModule } from './modules/faq/faq.module'
import { FinancialModule } from './modules/financial/financial.module'
import { LateFeesModule } from './modules/late-fees/late-fees.module'
import { LeasesModule } from './modules/leases/leases.module'
import { MaintenanceModule } from './modules/maintenance/maintenance.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { PropertiesModule } from './modules/properties/properties.module'
import { RentPaymentsModule } from './modules/rent-payments/rent-payments.module'
import { ReportsModule } from './modules/reports/reports.module'
import { StripeSyncModule } from './modules/stripe-sync/stripe-sync.module'
import { TenantsModule } from './modules/tenants/tenants.module'
import { UnitsModule } from './modules/units/units.module'
import { UsersModule } from './modules/users/users.module'
import { SecurityModule } from './security/security.module'
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard'
import { SubscriptionGuard } from './shared/guards/subscription.guard'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware'
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware'
import { RequestTimingMiddleware } from './shared/middleware/request-timing.middleware'
import { ServicesModule } from './shared/services/services.module'
import { SharedModule } from './shared/shared.module'
import { StripeConnectModule } from './stripe-connect/stripe-connect.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { TenantPortalModule } from './modules/tenant-portal/tenant-portal.module'
import { PrometheusModule } from './modules/observability'

/**
 * Core App Module - KISS principle
 * Essential business modules with simplified configuration
 */
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			cache: true, // Cache environment variables for performance
			expandVariables: true, // Allow ${VAR} expansion in .env files
			validate
		}),

		// Request context for tracing and user management
		ClsModule.forRoot({
			global: true,
			middleware: {
				mount: true,
				setup: (cls, req: Request) => {
					cls.set('REQUEST_CONTEXT', {
						requestId: randomUUID(),
						startTime: Date.now(),
						path: req.url,
						method: req.method
					})
				}
			}
		}),

		// Smart caching for database-heavy operations
		CacheModule.register({
			isGlobal: true,
			ttl: 30 * 1000, // 30 seconds default TTL
			max: 1000 // Maximum number of items in cache
		}),
		// Queue system for background jobs and rate limiting
		BullModule.forRoot({
			connection: {
				host: 'localhost',
				port: 6379
			}
		}),
		// Event system for decoupled architecture
		EventEmitterModule.forRoot({
			wildcard: true,
			delimiter: '.',
			maxListeners: 10,
			verboseMemoryLeak: true,
			ignoreErrors: false // CRITICAL: Propagate errors to controller
		}),
		// Native NestJS scheduler for cron jobs
		ScheduleModule.forRoot(),
		// Rate limiting - simple configuration
		ThrottlerModule.forRoot({
			throttlers: [
				{
					ttl: 60, // 1 minute
					limit: 100 // 100 requests per minute
				}
			]
		}),
		// CRITICAL: Global modules must come first for zero-downtime architecture
		SupabaseModule.forRootAsync(),
		// Prometheus metrics for Grafana/Prometheus integration
		PrometheusModule.forRoot({
			bearerToken: process.env.PROMETHEUS_BEARER_TOKEN || '',
			enableDefaultMetrics: true,
			prefix: 'tenantflow'
		}),
		SharedModule,
		ServicesModule,
		HealthModule,
		AnalyticsModule,
		StripeModule,
		StripeSyncModule,
		ContactModule,
		FAQModule,
		DashboardModule,
		FinancialModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		TenantPortalModule,
		LeasesModule,
		LateFeesModule,
		MaintenanceModule,
		NotificationsModule,
		RentPaymentsModule,
		StripeConnectModule,
		SubscriptionsModule,
		UsersModule,
		SecurityModule,
		ReportsModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe
		},
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard
		},
		{
			provide: APP_GUARD,
			useClass: SubscriptionGuard
		},
		{
			provide: APP_GUARD,
			useClass: ThrottlerProxyGuard
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: TimeoutInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: CacheControlInterceptor
		}
	],
	exports: []
})
export class AppModule implements NestModule {
	/**
	 * Configure middleware using official NestJS pattern
	 * https://docs.nestjs.com/middleware#applying-middleware
	 */
	configure(consumer: MiddlewareConsumer) {
		// Apply middleware in order: timing → ID → logging
		// Timing must run first to capture startTime
		// ID must run before logging to include requestId in logs
		consumer
			.apply(
				RequestTimingMiddleware,
				RequestIdMiddleware,
				RequestLoggerMiddleware
			)
			.forRoutes('*')
	}
}
