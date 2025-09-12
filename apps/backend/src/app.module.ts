import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
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
import { SharedModule } from './shared/shared.module'
import { LeasesModule } from './leases/leases.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
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

		// Simplified logging - native Pino without complex configuration
		LoggerModule.forRoot(),

		// Event system for decoupled architecture
		EventEmitterModule.forRoot(),

		// Rate limiting - simple configuration
		ThrottlerModule.forRoot([
			{
				ttl: 60000, // 1 minute
				limit: 100 // 100 requests per minute
			}
		]),

		// CRITICAL: Global modules must come first
		SupabaseModule,
		SharedModule,
		
		// Business modules that depend on global services
		AuthModule,
		StripeModule,
		PropertiesModule,
		UnitsModule,
		TenantsModule,
		LeasesModule,
		DashboardModule,
		MaintenanceModule,
		NotificationsModule,
		UsersModule
	],
	controllers: [AppController],
	providers: [AppService],
	exports: []
})
export class AppModule {}
