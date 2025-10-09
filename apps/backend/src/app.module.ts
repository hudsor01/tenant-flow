import { Module } from '@nestjs/common'
// Native NestJS Logger used throughout application
import { CacheModule } from '@nestjs/cache-manager'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ThrottlerModule } from '@nestjs/throttler'
import { randomUUID } from 'node:crypto'
import type { Request } from 'express'
import { ClsModule } from 'nestjs-cls'
import { AnalyticsModule } from './analytics/analytics.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { StripeModule } from './billing/stripe.module'
import { validate } from './config/config.schema'
import { ContactModule } from './contact/contact.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { SupabaseModule } from './database/supabase.module'
import { FinancialModule } from './financial/financial.module'
import { HealthModule } from './health/health.module'
import { CacheControlInterceptor } from './interceptors/cache-control.interceptor'
import { TimeoutInterceptor } from './interceptors/timeout.interceptor'
import { LateFeesModule } from './late-fees/late-fees.module'
import { LeaseModule } from './modules/leases/lease.module'
import { MaintenanceModule } from './modules/maintenance/maintenance.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PaymentMethodsModule } from './modules/payments/payment-methods.module'
import { PropertyModule } from './modules/properties/property.module'
import { RentPaymentsModule } from './rent-payments/rent-payments.module'
import { ReportsModule } from './reports/reports.module'
import { RepositoriesModule } from './repositories/repositories.module'
import { SecurityModule } from './security/security.module'
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard'
import { ServicesModule } from './shared/services/services.module'
import { SharedModule } from './shared/shared.module'
import { StripeConnectModule } from './stripe-connect/stripe-connect.module'
import { StripeWebhookModule } from './stripe-webhook/stripe-webhook.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { TenantModule } from './modules/tenants/tenant.module'
import { UnitsModule } from './units/units.module'
import { UsersModule } from './users/users.module'

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
		RepositoriesModule,
		ServicesModule,
		HealthModule,

		// Business modules that depend on global services
		AnalyticsModule,
		StripeModule,
		StripeConnectModule,
		StripeWebhookModule,
		SubscriptionsModule,
		RentPaymentsModule,
		PaymentMethodsModule,
		ContactModule,
		DashboardModule,
		FinancialModule,
		PropertyModule,
		UnitsModule,
		TenantModule,
		LeaseModule,
		LateFeesModule,
		MaintenanceModule,
		NotificationsModule,
		UsersModule,
		SecurityModule,
		ReportsModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard
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
