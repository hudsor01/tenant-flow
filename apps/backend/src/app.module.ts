import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD, Reflector } from '@nestjs/core'
import { BullModule } from '@nestjs/bullmq'

// Core modules (only these should be @Global)
import { TypeSafeConfigModule } from './common/config/config.module'
import { TypeSafeConfigService } from './common/config/config.service'
import { SupabaseModule } from './common/supabase/supabase.module'

// Feature modules (not @Global - import where needed)
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
import { UnitsModule } from './units/units.module'
import { LeasesModule } from './leases/leases.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { DocumentsModule } from './documents/documents.module'
import { UsersModule } from './users/users.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StripeModule } from './stripe/stripe.module'
import { BillingModule } from './billing/billing.module'
import { NotificationsModule } from './notifications/notifications.module'
import { HealthModule } from './health/health.module'
import { EmailModule } from './email/email.module'

// Guards & Interceptors (native NestJS)
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard'
import { AuthService } from './auth/auth.service'

// Controllers & Services
import { AppController } from './app.controller'
import { AppService } from './app.service'

/**
 * Root Application Module - Optimized for NestJS Native Features
 * 
 * Key improvements:
 * - Reduced @Global modules from 12 to 2 (Config + Database)
 * - Native NestJS Logger instead of Winston
 * - Native ValidationPipe instead of mixed Zod/class-validator
 * - Cleaner dependency injection patterns
 * 
 * @see https://docs.nestjs.com/modules#global-modules
 */
@Module({
	imports: [
		// Global modules (only essentials) - Config is @Global in TypeSafeConfigModule
		TypeSafeConfigModule,
		
		// Framework modules configured with TypeSafeConfig
		ThrottlerModule.forRootAsync({
			useFactory: (configService: TypeSafeConfigService) => [
				{
					ttl: configService.rateLimit.ttl,
					limit: configService.rateLimit.limit
				}
			],
			inject: [TypeSafeConfigService]
		}),
		
		// Database module (@Global in SupabaseModule)
		SupabaseModule,
		
		// Core NestJS modules
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		ConfigModule.forRoot(),
		
		// Queue management
		BullModule.forRoot({
			connection: {
				host: process.env.REDIS_HOST || 'localhost',
				port: parseInt(process.env.REDIS_PORT || '6379', 10)
			}
		}),
		
		// Feature modules (import where needed, not global)
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
		EmailModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		
		// Global guards using NestJS native patterns
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
		}
	]
})
export class AppModule {
	/**
	 * Root application module for the TenantFlow backend.
	 *
	 * Optimized to use NestJS native functionality:
	 * - Native Logger instead of Winston
	 * - Native ValidationPipe instead of Zod
	 * - Minimal @Global modules (only Config and Database)
	 * - Standard NestJS dependency injection patterns
	 *
	 * Request lifecycle management is handled through Fastify hooks
	 * for optimal performance with the Fastify adapter.
	 */
}