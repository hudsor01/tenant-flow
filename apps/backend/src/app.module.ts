import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard'
import { CsrfGuard } from './common/guards/csrf.guard'
import { CsrfTokenService } from './common/security/csrf-token.service'
import { SecurityMonitorService } from './common/security/security-monitor.service'
import { SessionUtilsService } from './common/utils/session-utils.service'
import { CsrfUtilsService } from './common/utils/csrf-utils.service'
import { NetworkUtilsService } from './common/utils/network-utils.service'
import { AuthService } from './auth/auth.service'
import { TypeSafeConfigModule } from './common/config/config.module'
import { TypeSafeConfigService } from './common/config/config.service'
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
import { SupabaseModule } from './common/supabase/supabase.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StripeModule } from './stripe/stripe.module'
import { BillingModule } from './billing/billing.module'
import { NotificationsModule } from './notifications/notifications.module'
import { HealthModule } from './health/health.module'
import { ErrorModule } from './common/errors/error.module'
import { SecurityModule } from './common/security/security.module'
import { RLSModule } from './database/rls/rls.module'
import { PDFModule } from './common/pdf/pdf.module'
import { LoggerModule } from './common/modules/logger.module'
// import { EmailModule } from './email/email.module' // Temporarily disabled - needs Redis configuration fix
import { VersioningModule } from './common/versioning/versioning.module'
import { AppInterceptor } from './common/interceptors/interceptor'
import { ApiVersionInterceptor } from './common/interceptors/api-version.interceptor'
import { CorsInterceptor } from './common/interceptors/cors.interceptor'
import { RequestLimitsMiddleware } from './common/middleware/request-limits.middleware'
// Fastify Hook System: Request lifecycle management is handled by FastifyHooksService
// which provides correlation IDs, content-type validation, and owner validation
// through Fastify's native hook system for better performance.

@Module({
	imports: [
		TypeSafeConfigModule,
		ThrottlerModule.forRootAsync({
			useFactory: (configService: TypeSafeConfigService) => [
				{
					ttl: configService.rateLimit.ttl,
					limit: configService.rateLimit.limit
				}
			],
			inject: [TypeSafeConfigService]
		}),
		SupabaseModule,
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		SecurityModule,
		ErrorModule,
		LoggerModule,
		VersioningModule,
		RLSModule,
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
		HealthModule,
		PDFModule
		// EmailModule // Temporarily disabled - needs Redis configuration fix
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useFactory: (authService: AuthService, reflector: Reflector) => {
				return new JwtAuthGuard(authService, reflector)
			},
			inject: [AuthService, Reflector]
		},
		{
			provide: APP_GUARD,
			useClass: CustomThrottlerGuard
		},
		{
			provide: APP_GUARD,
			useFactory: (
				reflector: Reflector,
				csrfTokenService: CsrfTokenService,
				securityMonitor: SecurityMonitorService,
				sessionUtils: SessionUtilsService,
				csrfUtils: CsrfUtilsService,
				networkUtils: NetworkUtilsService
			) => {
				return new CsrfGuard(
					reflector,
					csrfTokenService,
					securityMonitor,
					sessionUtils,
					csrfUtils,
					networkUtils
				)
			},
			inject: [
				Reflector,
				CsrfTokenService,
				SecurityMonitorService,
				SessionUtilsService,
				CsrfUtilsService,
				NetworkUtilsService
			]
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: AppInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: ApiVersionInterceptor
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: CorsInterceptor
		},
		RequestLimitsMiddleware
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
	 *
	 * @see FastifyHooksService at src/common/hooks/fastify-hooks.service.ts
	 */
}
