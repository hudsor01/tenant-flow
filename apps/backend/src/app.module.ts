import { Module } from '@nestjs/common'
// Native NestJS Logger used throughout application
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ThrottlerModule } from '@nestjs/throttler'
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

		// Native NestJS Logger - simplified configuration
		// Logger is automatically available throughout the application

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
