import { Module, DynamicModule } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { PaymentsService } from '../payments/payments.service'
import { MaintenanceService } from '../maintenance/maintenance.service'
import { StorageService } from '../storage/storage.service'
import { AppContext } from './context/app.context'
import { TrpcService } from './trpc.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { StripeModule } from '../stripe/stripe.module'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { SubscriptionService } from '../stripe/services/subscription.service'
import { PortalService } from '../stripe/services/portal.service'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from 'nestjs-prisma'

@Module({})
export class TrpcModule {
    static forRoot(): DynamicModule {
        return {
            module: TrpcModule,
            imports: [SubscriptionsModule, StripeModule, JwtModule.register({}), UsersModule, AuthModule, PrismaModule.forRoot({ isGlobal: true })],
            controllers: [],
            providers: [
                AppContext,
                TrpcService,
                // Services needed for routers
                PropertiesService,
                TenantsService,
                PaymentsService,
                MaintenanceService,
                StorageService,
                // Additional services for routers
                SubscriptionsService,
                SubscriptionService,
                PortalService,
            ],
            exports: [TrpcService],
            global: true,
        }
    }
}
