import { Module, DynamicModule } from '@nestjs/common'
import { PropertiesService } from '../properties/properties.service'
import { TenantsService } from '../tenants/tenants.service'
import { MaintenanceService } from '../maintenance/maintenance.service'
import { StorageService } from '../storage/storage.service'
import { AppContext } from './context/app.context'
import { TrpcService } from './trpc.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { StripeModule } from '../stripe/stripe.module'
import { SubscriptionsService } from '../subscriptions/subscriptions.service'
import { SubscriptionService } from '../stripe/subscription.service'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from '../prisma/prisma.module'
import { UnitsModule } from '../units/units.module'
import { UnitsService } from '../units/units.service'
import { LeasesModule } from '../leases/leases.module'
import { LeasesService } from '../leases/leases.service'

@Module({})
export class TrpcModule {
    static forRoot(): DynamicModule {
        return {
            module: TrpcModule,
            imports: [
                SubscriptionsModule, 
                StripeModule, 
                JwtModule.register({}), 
                UsersModule, 
                AuthModule, 
                PrismaModule,
                UnitsModule, 
                LeasesModule
            ],
            controllers: [],
            providers: [
                AppContext,
                TrpcService,
                // Services needed for routers
                PropertiesService,
                TenantsService,
                MaintenanceService,
                StorageService,
                // Subscription services
                SubscriptionsService,
                SubscriptionService,
                // Units and Leases services
                UnitsService,
                LeasesService,
            ],
            exports: [TrpcService],
            global: true,
        }
    }
}