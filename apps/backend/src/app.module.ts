/**
 * TenantFlow App Module - Module Architecture (ADR-0007)
 *
 * Module size thresholds:
 * | Metric      | Good   | Warning    | Action Required |
 * |-------------|--------|------------|-----------------|
 * | Lines       | <5,000 | 5,000-8,000| >8,000          |
 * | Services    | <8     | 8-12       | >12             |
 * | Controllers | <4     | 4-6        | >6              |
 *
 * Current oversized modules (see ADR-0007 for refactoring guidance):
 * - billing: 14k lines (extract shared Stripe services)
 * - tenants: 12k lines (audit and consolidate services)
 * - leases: 10k lines (acceptable, monitor)
 *
 * Circular dependency signals:
 * - forwardRef() usage indicates shared services should be extracted
 * - See billing/ sub-modules for example of circular deps to resolve
 *
 * Performance baseline (ADR-0008):
 * - Startup time: 0.87s (53 modules, excellent)
 * - Lazy loading: not applicable (all candidates have controllers)
 *
 * API Response Standards (ADR-0006):
 * - List: { data: T[], total, limit, offset, hasMore }
 * - Detail: raw entity object
 * - Create/Update: created/updated entity
 * - Delete: { message: "X deleted successfully" }
 * - Action: { success: true, ...result }
 *
 * @see .planning/adr/0006-api-response-standards.md
 * @see .planning/adr/0007-module-architecture.md
 * @see .planning/adr/0008-cold-start-optimization.md
 */
import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { HttpModule } from '@nestjs/axios'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bullmq'
import { BullBoardModule } from '@bull-board/nestjs'
import { ExpressAdapter } from '@bull-board/express'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import type { Request, Response, NextFunction } from 'express'
import { ClsModule } from 'nestjs-cls'
import { ZodValidationPipe } from 'nestjs-zod'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { validate } from './config/config.schema'
import { AppConfigService } from './config/app-config.service'
import { LoggerModule } from './logger/winston.module'
import { CacheConfigurationModule } from './cache/cache.module'
import { SupabaseModule } from './database/supabase.module'
import { SupabaseService } from './database/supabase.service'
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
import { SentryContextMiddleware } from './shared/middleware/sentry-context.middleware'
import { ServicesModule } from './shared/services/services.module'
import { SharedModule } from './shared/shared.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { TenantPortalModule } from './modules/tenant-portal/tenant-portal.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { DocuSealModule } from './modules/docuseal/docuseal.module'
import { AdminModule } from './modules/admin/admin.module'
import { DocumentsModule } from './modules/documents/documents.module'

const ENV_FILE_CANDIDATES = [
	`.env.${process.env.NODE_ENV}.local`,
	`.env.${process.env.NODE_ENV}`,
	'.env.local',
	'.env'
]

const ENV_FILE_PATHS = ENV_FILE_CANDIDATES.map(candidate =>
	resolve(process.cwd(), candidate)
).filter(path => existsSync(path))

/**
 * Core App Module - KISS principle
 * Essential business modules with simplified configuration
 */
@Module({
	imports: [
		// Sentry error tracking and performance monitoring
		SentryModule.forRoot(),

		ConfigModule.forRoot({
			isGlobal: true,
			...(ENV_FILE_PATHS.length > 0 && { envFilePath: ENV_FILE_PATHS }),
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
		// Sentry global error filter - must be first to catch all exceptions
		{
			provide: APP_FILTER,
			useClass: SentryGlobalFilter
		},
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
	private readonly logger = new Logger(AppModule.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Configure middleware using official NestJS pattern
	 * https://docs.nestjs.com/middleware#applying-middleware
	 */
	configure(consumer: MiddlewareConsumer) {
		// Bull Board auth middleware - protects /admin/queues from unauthenticated access
		// Bull Board uses Express directly, bypassing NestJS guards, so we must
		// use Express middleware to enforce authentication on these routes.
		consumer
			.apply(
				async (req: Request, res: Response, next: NextFunction) => {
					const user = await this.supabaseService.getUser(req)
					if (!user) {
						this.logger.warn(
							`Unauthorized Bull Board access attempt from ${req.ip}`
						)
						res.status(401).json({ message: 'Authentication required' })
						return
					}
					next()
				}
			)
			.forRoutes('/admin/queues')

		// Apply middleware in order: timing → ID → Sentry context → logging
		// Timing must run first to capture startTime
		// ID must run before Sentry/logging to include requestId
		// Sentry context sets user/tenant tags for error correlation
		consumer
			.apply(
				RequestTimingMiddleware,
				RequestIdMiddleware,
				SentryContextMiddleware,
				RequestLoggerMiddleware
			)
			.forRoutes('*')
	}
}
