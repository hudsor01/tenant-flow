import { Module, RequestMethod } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { LoggerModule } from 'nestjs-pino'
import { validate } from './config/config.schema'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import { ThrottlerExceptionFilter } from './shared/filters/throttler-exception.filter'
import { SupabaseModule } from './database/supabase.module'
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { UnitsModule } from './units/units.module'
import { TenantsModule } from './tenants/tenants.module'
import { LeasesModule } from './leases/leases.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { HealthModule } from './health/health.module'
import { StripeModule } from './billing/stripe.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AnalyticsService } from './analytics/analytics.service'
import { StripeService } from './billing/stripe.service'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HEALTH_PATHS } from './shared/constants/routes'

/**
 * Core App Module - KISS principle
 * Properties, Leases, Tenants CRUD + Supabase Auth + Stripe + PostHog
 */
@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate
		}),

		// Ultra-fast Pino logging with Fastify integration and request context
		LoggerModule.forRoot({
			pinoHttp: {
				level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
				transport: process.env.NODE_ENV !== 'production' 
					? { 
						target: 'pino-pretty',
						options: {
							colorize: true,
							translateTime: 'HH:MM:ss Z',
							ignore: 'pid,hostname,req,res',
							singleLine: false,
							hideObject: false
						}
					} 
					: undefined,
				// Automatic request/response logging with request context
				autoLogging: {
					ignore: (req: { url?: string }) => {
						// Ignore health check endpoints to reduce noise
						const path = req.url
						return !!(path === '/health' || 
							     path === '/health/ping' || 
							     path === '/health/ready' ||
							     path?.startsWith('/health/'))
					}
				},
				// Custom serializers for better log structure
				serializers: {
					req: (req: {
						id?: string;
						method?: string;
						url?: string;
						query?: unknown;
						params?: unknown;
						headers?: Record<string, unknown>;
						ip?: string;
						socket?: { remotePort?: number };
					}) => ({
						id: req.id,
						method: req.method,
						url: req.url,
						query: req.query,
						params: req.params,
						headers: {
							'user-agent': req.headers?.['user-agent'],
							'accept': req.headers?.['accept'],
							'content-type': req.headers?.['content-type'],
							'x-forwarded-for': req.headers?.['x-forwarded-for'],
							'x-real-ip': req.headers?.['x-real-ip']
						},
						remoteAddress: req.ip,
						remotePort: req.socket?.remotePort
					}),
					res: (res: {
						statusCode?: number;
						getHeader?: (name: string) => unknown;
					}) => ({
						statusCode: res.statusCode,
						headers: {
							'content-type': res.getHeader?.('content-type'),
							'content-length': res.getHeader?.('content-length'),
							'cache-control': res.getHeader?.('cache-control'),
							'etag': res.getHeader?.('etag')
						}
					}),
					// Safe error logging without sensitive data
					err: (err: {
						constructor: { name: string };
						message?: string;
						code?: string | number;
						statusCode?: number;
						stack?: string;
					}) => ({
						type: err.constructor.name,
						message: err.message,
						code: err.code,
						statusCode: err.statusCode,
						// Only include stack trace in development
						...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
					})
				},
				// Enhanced formatting for production structured logs
				formatters: {
					level(label: string) {
						// Use consistent log level format for parsing
						return { level: label }
					}
				},
				// Request ID generation for correlation
				genReqId: (req: { headers?: Record<string, unknown> }) => {
					// Use existing request ID from context if available
					const existingId = req.headers?.['x-request-id'] || req.headers?.['x-correlation-id']
					if (existingId && typeof existingId === 'string') return existingId
					
					// Generate new correlation ID
					return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
				},
				// Custom request message
				customSuccessMessage: (
					req: { method?: string; url?: string }, 
					res: { statusCode?: number }, 
					responseTime: number
				) => {
					return `${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`
				},
				customErrorMessage: (
					req: { method?: string; url?: string }, 
					res: { statusCode?: number }, 
					err: { message?: string }
				) => {
					return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`
				}
			},
			// Apply request context logging to all routes except health checks
			exclude: [
				...HEALTH_PATHS.map(path => ({ method: RequestMethod.ALL, path }))
			]
		}),

		// Event-driven architecture support
		EventEmitterModule.forRoot({
			wildcard: false,
			delimiter: '.',
			newListener: false,
			removeListener: false,
			maxListeners: 10,
			verboseMemoryLeak: false,
			ignoreErrors: false
		}),

		// Scheduled jobs (cron)
		ScheduleModule.forRoot(),

		SupabaseModule,

		// Rate limiting - simple and effective
		ThrottlerModule.forRoot([
			{
				ttl: 60000, // 1 minute
				limit: 100 // 100 requests per minute (global default)
			}
		]),

		// Core CRUD modules
		AuthModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		LeasesModule,
		DashboardModule,
		MaintenanceModule,
		HealthModule,
		StripeModule,
        NotificationsModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		AnalyticsService,
		StripeService,
		// Global rate limiting guard with proxy support
		{
			provide: APP_GUARD,
			useClass: ThrottlerProxyGuard
		},
		// Global exception filter for rate limiting errors
		{
			provide: APP_FILTER,
			useClass: ThrottlerExceptionFilter
		}
	],
	exports: [AnalyticsService, StripeService]
})
export class AppModule {}
