import { Module } from '@nestjs/common'
import { HonoService } from './hono.service'
import { AuthModule } from '../auth/auth.module'
import { PropertiesModule } from '../properties/properties.module'
import { TenantsModule } from '../tenants/tenants.module'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { UnitsModule } from '../units/units.module'
import { LeasesModule } from '../leases/leases.module'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'
import { StripeModule } from '../stripe/stripe.module'
import { UsersModule } from '../users/users.module'
import { StorageModule } from '../storage/storage.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [
    AuthModule,
    PropertiesModule,
    TenantsModule,
    MaintenanceModule,
    UnitsModule,
    LeasesModule,
    SubscriptionsModule,
    StripeModule,
    UsersModule,
    StorageModule,
    EmailModule
  ],
  providers: [HonoService],
  exports: [HonoService]
})
export class HonoModule {}