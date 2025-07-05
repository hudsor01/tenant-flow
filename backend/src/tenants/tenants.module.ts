import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
