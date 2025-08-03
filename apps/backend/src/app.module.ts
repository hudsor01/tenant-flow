import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
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
import { PrismaModule } from 'nestjs-prisma'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { StripeModule } from './stripe/stripe.module'
import { BillingModule } from './billing/billing.module'
import { NotificationsModule } from './notifications/notifications.module'
import { ErrorModule } from './common/errors/error.module'
import { SecurityModule } from './common/security/security.module'
import { RLSModule } from './database/rls/rls.module'
import { ContentTypeMiddleware } from './common/middleware/content-type.middleware'
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware'
import { OwnerValidationMiddleware } from './common/middleware/owner-validation.middleware'
import { SecurityMonitoringInterceptor } from './common/interceptors/security-monitoring.interceptor'
import { CsrfController } from './common/controllers/csrf.controller'

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
		PrismaModule.forRoot({
			isGlobal: true
		}),
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
		NotificationsModule
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
			useClass: ThrottlerGuard
		},
		{
			provide: APP_INTERCEPTOR,
			useClass: SecurityMonitoringInterceptor
		}
	]
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		// Apply correlation ID middleware to all routes
		consumer
			.apply(CorrelationIdMiddleware)
			.forRoutes('*')

		// Apply owner validation middleware to API routes
		consumer
			.apply(OwnerValidationMiddleware)
			.exclude('/health', '/health/simple', '/', '/api/docs/(.*)', '/api/auth/login', '/api/auth/register')
			.forRoutes('/api/(.*)')

		// Apply content-type validation middleware to specific routes, NOT health checks
		consumer
			.apply(ContentTypeMiddleware)
			.exclude('/health', '/health/simple', '/', '/api/docs/(.*)')
			.forRoutes('(.*)')
	}
}
