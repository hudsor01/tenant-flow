import { Module } from '@nestjs/common'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceController } from './maintenance.controller'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [],
	controllers: [MaintenanceController],
	providers: [MaintenanceService],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
