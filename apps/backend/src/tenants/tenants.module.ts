import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { StorageModule } from '../storage/storage.module'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [StorageModule],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
