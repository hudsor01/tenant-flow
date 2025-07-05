import { Module } from '@nestjs/common'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [LeasesController],
	providers: [LeasesService],
	exports: [LeasesService]
})
export class LeasesModule {}
