import { Module, DynamicModule } from '@nestjs/common'
import { AppContext } from './context/app.context'
import { TrpcService } from './trpc.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { StripeModule } from '../stripe/stripe.module'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'
import { EmailModule } from '../email/email.module'
import { PrismaModule } from '../prisma/prisma.module'
import { UnitsModule } from '../units/units.module'
import { LeasesModule } from '../leases/leases.module'

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
                EmailModule, 
                PrismaModule,
                UnitsModule, 
                LeasesModule
            ],
            controllers: [],
            providers: [
                AppContext,
                TrpcService,
                // Note: We don't need to provide all services here since they're already
                // provided by their respective modules which we import above
            ],
            exports: [TrpcService, AppContext],
            global: true,
        }
    }
}