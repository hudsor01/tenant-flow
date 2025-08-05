import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { APP_GUARD } from '@nestjs/core'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard'
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
import { PrismaModule } from './prisma/prisma.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StripeModule } from './stripe/stripe.module'
import { BillingModule } from './billing/billing.module'
import { NotificationsModule } from './notifications/notifications.module'
import { ErrorModule } from './common/errors/error.module'
import { SecurityModule } from './common/security/security.module'
import { RLSModule } from './database/rls/rls.module'
// Fastify Hook System: Request lifecycle management is handled by FastifyHooksService
// which provides correlation IDs, content-type validation, and owner validation
// through Fastify's native hook system for better performance.
import { CsrfController } from './common/controllers/csrf.controller'

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
		PrismaModule,
		EventEmitterModule.forRoot(),
		ScheduleModule.forRoot(),
		SecurityModule,
		ErrorModule,
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
	],
	controllers: [AppController, CsrfController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: JwtAuthGuard
		},
		{
			provide: APP_GUARD,
			useClass: CustomThrottlerGuard
		},
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
