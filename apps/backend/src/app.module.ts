import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { validate } from './config/config.schema'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import { ThrottlerExceptionFilter } from './shared/filters/throttler-exception.filter'
import { SupabaseModule } from './database/supabase.module'
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
import { LeasesModule } from './leases/leases.module'
import { DocumentsModule } from './documents/documents.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { HealthModule } from './health/health.module'
import { StripeModule } from './stripe/stripe.module'
import { AnalyticsService } from './analytics/analytics.service'
import { StripeService } from './billing/stripe.service'
import { MetricsService } from './services/metrics.service'
import { AppController } from './app.controller'
import { AppService } from './app.service'

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
		TenantsModule,
		LeasesModule,
		DocumentsModule,
		DashboardModule,
		MaintenanceModule,
		HealthModule,
		StripeModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		AnalyticsService,
		StripeService,
		MetricsService,
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
