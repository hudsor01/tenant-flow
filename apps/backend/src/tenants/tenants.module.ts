import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
import { StorageModule } from '../storage/storage.module'
import { StripeModule } from '../stripe/stripe.module'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [StorageModule, StripeModule],
	controllers: [TenantsController],
	providers: [TenantsService, TenantsRepository],
	exports: [TenantsService]
})
export class TenantsModule {}
