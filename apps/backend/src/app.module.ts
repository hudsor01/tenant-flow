import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerProxyGuard } from './shared/guards/throttler-proxy.guard'
import { SupabaseModule } from './database/supabase.module'
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
import { LeasesModule } from './leases/leases.module'
import { DocumentsModule } from './documents/documents.module'
import { HealthModule } from './health/health.module'
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
		ConfigModule.forRoot({ isGlobal: true }),
		SupabaseModule,

		// Rate limiting with environment-based configuration
		ThrottlerModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (config: ConfigService) => [
				{
					name: 'default',
					ttl: parseInt(config.get('RATE_LIMIT_TTL', '60000')), // 1 minute default
					limit: parseInt(config.get('RATE_LIMIT_LIMIT', '100')) // 100 requests default
				},
				{
					name: 'auth',
					ttl: parseInt(config.get('AUTH_RATE_LIMIT_TTL', '60000')), // 1 minute
					limit: parseInt(config.get('AUTH_RATE_LIMIT_LIMIT', '5')) // 5 requests for auth
				},
				{
					name: 'webhook',
					ttl: parseInt(
						config.get('WEBHOOK_RATE_LIMIT_TTL', '60000')
					), // 1 minute
					limit: parseInt(
						config.get('WEBHOOK_RATE_LIMIT_LIMIT', '200')
					) // 200 for webhooks
				}
			]
		}),

		// Core CRUD modules
		AuthModule,
		PropertiesModule,
		TenantsModule,
		LeasesModule,
		DocumentsModule,
		HealthModule
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
		}
	],
	exports: [AnalyticsService, StripeService]
})
export class AppModule {}
