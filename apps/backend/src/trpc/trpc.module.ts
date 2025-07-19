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
import { PortalService } from '../stripe/services/portal.service'
import { StripeService } from '../stripe/services/stripe.service'
import { WebhookService } from '../stripe/services/webhook.service'
// EnhancedStripeService removed for current release
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'
import { PrismaModule } from 'nestjs-prisma'
import { UnitsModule } from '../units/units.module'
import { UnitsService } from '../units/units.service'
import { LeasesModule } from '../leases/leases.module'
import { LeasesService } from '../leases/leases.service'

@Module({})
export class TrpcModule {
    static forRoot(): DynamicModule {
        return {
            module: TrpcModule,
            imports: [SubscriptionsModule, StripeModule, JwtModule.register({}), UsersModule, AuthModule, PrismaModule.forRoot({ isGlobal: true }), UnitsModule, LeasesModule],
            controllers: [],
            providers: [
                AppContext,
                TrpcService,
                // Services needed for routers
                PropertiesService,
                TenantsService,
                MaintenanceService,
                StorageService,
                // Additional services for routers
                SubscriptionsService,
                PortalService,
                // Stripe services for payment processing
                StripeService,
                WebhookService,
                // EnhancedStripeService removed for current release
                // Units and Leases services
                UnitsService,
                LeasesService,
            ],
            exports: [TrpcService],
            global: true,
        }
    }
}
