import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { PropertiesModule } from './properties/properties.module'
import { TenantsModule } from './tenants/tenants.module'
import { UnitsModule } from './units/units.module'
import { LeasesModule } from './leases/leases.module'
import { PaymentsModule } from './payments/payments.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { NotificationsModule } from './notifications/notifications.module'
import { UsersModule } from './users/users.module'
import { PrismaModule } from 'nestjs-prisma'
import { InvoicesModule } from './invoices/invoices.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { ActivityModule } from './activity/activity.module'
import { StripeModule } from './stripe/stripe.module'
// Removed ContractorsModule and WebSocketModule - they don't exist in actual project

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
					ttl: configService.get<number>('RATE_LIMIT_TTL') || 60000, // 1 minute
					limit: configService.get<number>('RATE_LIMIT_LIMIT') || 100 // requests per minute
				}
			],
			inject: [ConfigService]
		}),
		PrismaModule.forRoot({
			isGlobal: true
		}),
		AuthModule,
		PropertiesModule,
		TenantsModule,
		UnitsModule,
		LeasesModule,
		PaymentsModule,
		MaintenanceModule,
		NotificationsModule,
		UsersModule,
		InvoicesModule,
		SubscriptionsModule,
		ActivityModule,
		StripeModule
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard
		}
	]
})
export class AppModule {}
