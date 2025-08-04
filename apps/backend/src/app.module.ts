import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
import { UnitsModule } from './units/units.module'
import { LeasesModule } from './leases/leases.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { DocumentsModule } from './documents/documents.module'
import { UsersModule } from './users/users.module'
import { PrismaModule } from './prisma/prisma.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StripeModule } from './stripe/stripe.module'
import { BillingModule } from './billing/billing.module'
import { NotificationsModule } from './notifications/notifications.module'
import { WebhookModule } from './webhook/webhook.module'
// import { DebugModule } from './common/debug/debug.module' // Removed due to compilation issues
import { ErrorModule } from './common/errors/error.module'
import { SecurityModule } from './common/security/security.module'
import { RLSModule } from './database/rls/rls.module'
// Fastify Hook System: Request lifecycle management is handled by FastifyHooksService
// which provides correlation IDs, content-type validation, and owner validation
// through Fastify's native hook system for better performance.
import { SecurityMonitoringInterceptor } from './common/interceptors/security-monitoring.interceptor'
// import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor'
import { CsrfController } from './common/controllers/csrf.controller'
import { ComplianceController } from './common/controllers/compliance.controller'
// import { PerformanceMonitorModule } from './common/performance/performance-monitor.module'
// import { MfaGuard } from './auth/guards/mfa.guard'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.local', '.env'],
			validate: (config) => {
				// Simple validation using NestJS built-in approach
				const required = [
					'DATABASE_URL',
					'DIRECT_URL', 
					'JWT_SECRET',
					'SUPABASE_URL',
					'SUPABASE_SERVICE_ROLE_KEY',
					'SUPABASE_JWT_SECRET',
					'CORS_ORIGINS'
				]
				
				const missing = required.filter(key => !config[key])
				if (missing.length > 0) {
					throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
				}
				
				// Validate CORS in production
				if (config.NODE_ENV === 'production' && config.CORS_ORIGINS) {
					const origins = config.CORS_ORIGINS.split(',')
					const httpOrigins = origins.filter((origin: string) => origin.trim().startsWith('http://'))
					if (httpOrigins.length > 0) {
						throw new Error(`Production cannot have HTTP origins: ${httpOrigins.join(', ')}`)
					}
				}
				
				return config
			},
		}),
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => [
				{
					ttl: configService.get<number>('RATE_LIMIT_TTL') || 60000,
					limit: configService.get<number>('RATE_LIMIT_LIMIT') || 100
				}
			],
			inject: [ConfigService]
		}),
		PrismaModule,
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		SecurityModule,
		ErrorModule,
		RLSModule,
		// PerformanceMonitorModule, // Temporarily disabled due to runtime error
		AuthModule,
		PropertiesModule,
		TenantsModule,
		UnitsModule,
		LeasesModule,
		MaintenanceModule,
		DocumentsModule,
		UsersModule,
		SubscriptionsModule,
		StripeModule,
		BillingModule,
		NotificationsModule,
		WebhookModule,
		// DebugModule // Removed due to compilation issues
	],
	controllers: [AppController, CsrfController, ComplianceController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard
		},
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard
		},
		// {
		// 	provide: APP_GUARD,
		// 	useClass: MfaGuard
		// },
		{
			provide: APP_INTERCEPTOR,
			useClass: SecurityMonitoringInterceptor
		},
		// {
		// 	provide: APP_INTERCEPTOR,
		// 	useClass: AuditLoggingInterceptor
		// }
	]
})
export class AppModule {
	/**
	 * Root application module for the TenantFlow backend.
	 * 
	 * This module orchestrates all feature modules and configures global providers.
	 * Request lifecycle management (middleware functionality) is implemented through
	 * Fastify hooks rather than traditional NestJS middleware for optimal performance.
	 * 
	 * Key architectural decisions:
	 * - Uses Fastify adapter instead of Express for 30-50% better performance
	 * - Implements request lifecycle through FastifyHooksService hooks
	 * - Global JWT authentication with JwtAuthGuard
	 * - Rate limiting with ThrottlerGuard
	 * - Security monitoring with SecurityMonitoringInterceptor
	 * 
	 * @see FastifyHooksService at src/common/hooks/fastify-hooks.service.ts
	 */
}
