import { Module } from '@nestjs/common'
import type { IncomingMessage, ServerResponse } from 'http'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ThrottlerModule } from '@nestjs/throttler'
import { LoggerModule } from 'nestjs-pino'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { StripeModule } from './billing/stripe.module'
import { validate } from './config/config.schema'
import { DashboardModule } from './dashboard/dashboard.module'
import { SupabaseModule } from './database/supabase.module'
import { HealthModule } from './health/health.module'
import { CacheControlInterceptor } from './interceptors/cache-control.interceptor'
import { PerformanceInterceptor } from './interceptors/performance.interceptor'
import { TimeoutInterceptor } from './interceptors/timeout.interceptor'
import { LeasesModule } from './leases/leases.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PropertiesModule } from './properties/properties.module'
import { SharedModule } from './shared/shared.module'
import { TenantsModule } from './tenants/tenants.module'
import { UnitsModule } from './units/units.module'
import { UsersModule } from './users/users.module'
import { SecurityModule } from './security/security.module'

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

		// Simplified logging - native Pino without complex configuration
		LoggerModule.forRoot({
			pinoHttp: {
				level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
                // Generate or reuse a correlation ID and attach it to logs
                genReqId(req: IncomingMessage & { id?: unknown }): string {
                    const header = req.headers['x-request-id']
                    const headerId = Array.isArray(header) ? header[0] : header
                    const coerce = (v: unknown): string | undefined =>
                        typeof v === 'string' ? v : typeof v === 'number' ? String(v) : undefined
                    return (
                        coerce(headerId) ||
                        coerce(req.id) ||
                        (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))
                    )
                },
                customProps(
                    req: IncomingMessage & { id?: unknown; socket?: { remoteAddress?: string }; ip?: string },
                    _res: ServerResponse
                ) {
                    return {
                        requestId: ((): string => {
                            const v = (req as { id?: unknown }).id
                            return typeof v === 'string' || typeof v === 'number' ? String(v) : ''
                        })(),
                        remoteAddress: req.socket?.remoteAddress || req.ip || undefined
                    }
                },
                customLogLevel(
                    _req: IncomingMessage,
                    res: ServerResponse & { statusCode: number },
                    err?: Error | null
                ) {
                    if (err || res.statusCode >= 500) return 'error'
                    if (res.statusCode >= 400) return 'warn'
                    return 'info'
                },
                customReceivedMessage(req: IncomingMessage & { method?: string; url?: string }) {
                    const m = req.method || 'UNKNOWN'
                    const u = req.url || ''
                    return `incoming request ${m} ${u}`
                },
                customSuccessMessage(
                    req: IncomingMessage & { method?: string; url?: string },
                    res: ServerResponse & { statusCode: number }
                ) {
                    const m = req.method || 'UNKNOWN'
                    const u = req.url || ''
                    return `request completed ${m} ${u} ${res.statusCode}`
                },
                customErrorMessage(
                    req: IncomingMessage & { method?: string; url?: string },
                    res: ServerResponse & { statusCode: number },
                    err?: unknown
                ) {
                    const m = req.method || 'UNKNOWN'
                    const u = req.url || ''
                    const msg = err instanceof Error ? err.message : ''
                    return `request errored ${m} ${u} ${res.statusCode} ${msg}`.trim()
                },
				transport:
					process.env.NODE_ENV !== 'production'
						? { target: 'pino-pretty' }
						: undefined
			}
		}),

		// Event system for decoupled architecture
		EventEmitterModule.forRoot(),

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
		SupabaseModule,
		SharedModule,
		HealthModule, // Enhanced health monitoring

		// Business modules that depend on global services
		AuthModule,
		StripeModule,
		DashboardModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		LeasesModule,
		MaintenanceModule,
		NotificationsModule,
		UsersModule,
		SecurityModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		// Zero-downtime interceptors for performance and reliability
		{
			provide: APP_INTERCEPTOR,
			useClass: PerformanceInterceptor
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
export class AppModule {}
