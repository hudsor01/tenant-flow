import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
import { FairHousingService } from '../common/validation/fair-housing.service'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [StorageModule, StripeModule],
	controllers: [TenantsController],
	providers: [TenantsService, TenantsRepository, FairHousingService],
	exports: [TenantsService]
})
export class TenantsModule {}
