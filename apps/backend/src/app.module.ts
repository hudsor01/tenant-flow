import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bullmq'
import { BullBoardModule } from '@bull-board/nestjs'
import { ExpressAdapter } from '@bull-board/express'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import type { Request } from 'express'
import { ClsModule } from 'nestjs-cls'
import { ZodValidationPipe } from 'nestjs-zod'
import { randomUUID } from 'node:crypto'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { validate } from './config/config.schema'
import { AppConfigService } from './config/app-config.service'
import { LoggerModule } from './logger/winston.module'
import { CacheConfigurationModule } from './cache/cache.module'
import { SupabaseModule } from './database/supabase.module'
import { HealthModule } from './health/health.module'
import { CacheControlInterceptor } from './interceptors/cache-control.interceptor'
import { TimeoutInterceptor } from './interceptors/timeout.interceptor'
import { HttpMetricsInterceptor } from './interceptors/http-metrics.interceptor'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { StripeModule } from './modules/billing/stripe.module'
import { ContactModule } from './modules/contact/contact.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { FinancialModule } from './modules/financial/financial.module'
import { LateFeesModule } from './modules/late-fees/late-fees.module'
import { LeasesModule } from './modules/leases/leases.module'
import { MaintenanceModule } from './modules/maintenance/maintenance.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { OwnerDashboardModule } from './modules/owner-dashboard/owner-dashboard.module'
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
import { RolesGuard } from './shared/guards/roles.guard'
import { RequestIdMiddleware } from './shared/middleware/request-id.middleware'
import { RequestLoggerMiddleware } from './shared/middleware/request-logger.middleware'
import { RequestTimingMiddleware } from './shared/middleware/request-timing.middleware'
import { ServicesModule } from './shared/services/services.module'
import { SharedModule } from './shared/shared.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { TenantPortalModule } from './modules/tenant-portal/tenant-portal.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { DocuSealModule } from './modules/docuseal/docuseal.module'
import { AdminModule } from './modules/admin/admin.module'
import { DocumentsModule } from './modules/documents/documents.module'

/**
 * Core App Module - KISS principle
 * Essential business modules with simplified configuration
 */
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate
		}),

		// Centralized logging configured via Winston
		LoggerModule,

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

		// Unified Redis cache with TTL tiers
		CacheConfigurationModule.forRoot({
			isGlobal: true,
			ttlShortMs: 30_000,
			ttlMediumMs: 5 * 60 * 1000,
			ttlLongMs: 30 * 60 * 1000,
			keyPrefix: 'cache'
		}),

		// Event system for decoupled architecture
		EventEmitterModule.forRoot(),

		// HTTP client for internal API calls (used by batch endpoint)
		HttpModule,

		// Native NestJS scheduler for cron jobs
		ScheduleModule.forRoot(),

		// Prometheus metrics handled by MetricsModule with custom controller and @Public() auth

		// Rate limiting - configurable via environment
		ThrottlerModule.forRootAsync({
			imports: [SharedModule],
			useFactory: (config: AppConfigService) => {
				const ttlMs = config.getRateLimitTtl()
				const limit = config.getRateLimitLimit()
				return {
					throttlers: [
						{
							ttl: ttlMs ? Math.ceil(parseInt(ttlMs, 10) / 1000) : 60,
							limit: limit ? parseInt(limit, 10) : 100
						}
					]
				}
			},
			inject: [AppConfigService]
		}),

		// CRITICAL: Global modules must come first for zero-downtime architecture
		SupabaseModule.forRootAsync(),
		SharedModule,
		ServicesModule,
		HealthModule,
		MetricsModule,
		AnalyticsModule,

		// BullMQ configuration (before feature modules)
		BullModule.forRootAsync({
			imports: [SharedModule],
			useFactory: (config: AppConfigService) => {
				const redisUrl = config.getRedisUrl()
				const redisHost = config.getRedisHost()
				const username = config.getRedisUsername()
				const password = config.getRedisPassword()
				const db = config.getRedisDb()
				const tlsEnabled = config.getRedisTls()

				if (config.isProduction() && !redisUrl && !redisHost) {
					throw new Error(
						'Redis is required in production. Set REDIS_URL (recommended) or REDIS_HOST/REDIS_PORT.'
					)
				}

				if (redisUrl) {
					const url = new URL(redisUrl)
					const urlDb =
						url.pathname && url.pathname !== '/'
							? Number(url.pathname.slice(1))
							: undefined
					const urlPort = url.port && url.port !== '' ? Number(url.port) : 6379

					return {
						connection: {
							host: url.hostname,
							port: Number.isFinite(urlPort) ? urlPort : 6379,
							...(url.username ? { username: url.username } : {}),
							...(url.password ? { password: url.password } : {}),
							...(Number.isFinite(urlDb) ? { db: urlDb as number } : {}),
							...(url.protocol === 'rediss:' || tlsEnabled ? { tls: {} } : {})
						},
						defaultJobOptions: {
							attempts: 3,
							backoff: {
								type: 'exponential',
								delay: 5000
							}
						}
					}
				}

				const port = parseInt(config.getRedisPort() || '6379', 10)
				const dbNumber = db ? Number(db) : undefined

				return {
					connection: {
						host: redisHost || 'localhost',
						port: Number.isFinite(port) ? port : 6379,
						...(username && { username }),
						...(password && { password }),
						...(Number.isFinite(dbNumber) ? { db: dbNumber as number } : {}),
						...(tlsEnabled ? { tls: {} } : {})
					},
					defaultJobOptions: {
						attempts: 3,
						backoff: {
							type: 'exponential',
							delay: 5000
						}
					}
				}
			},
			inject: [AppConfigService]
		}),

		// Bull Board dashboard for queue monitoring
		BullBoardModule.forRoot({
			route: '/admin/queues',
			adapter: ExpressAdapter
		}),
		BullBoardModule.forFeature({
			name: 'emails',
			adapter: BullMQAdapter
		}),
		BullBoardModule.forFeature({
			name: 'stripe-webhooks',
			adapter: BullMQAdapter
		}),

		StripeModule,
		StripeSyncModule,
		ContactModule,
		DashboardModule,
		FinancialModule,
		OwnerDashboardModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		TenantPortalModule,
		LeasesModule,
		LateFeesModule,
		MaintenanceModule,
		NotificationsModule,
		RentPaymentsModule,
		SubscriptionsModule,
		UsersModule,
		SecurityModule,
		ReportsModule,
		DocuSealModule,
		AdminModule,
		DocumentsModule
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
			useClass: ThrottlerProxyGuard
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
			useClass: RolesGuard
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: HttpMetricsInterceptor
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
