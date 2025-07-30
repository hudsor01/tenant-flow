import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
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
import { CsrfController } from './common/controllers/csrf.controller'

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ['.env.local', '.env']
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
		}
	]
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		// Apply content-type validation middleware to all routes
		consumer
			.apply(ContentTypeMiddleware)
			.forRoutes('*')
	}
}
