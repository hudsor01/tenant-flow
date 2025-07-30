import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRequestRepository],
  exports: [MaintenanceService, MaintenanceRequestRepository]
})
export class MaintenanceModule {}
