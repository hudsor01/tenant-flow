import { Module } from '@nestjs/common'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceRequestRepository } from './maintenance-request.repository'
import { PrismaModule } from '../prisma/prisma.module'
import { SupabaseService } from '../common/supabase.service'

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceRequestRepository, SupabaseService],
  exports: [MaintenanceService, MaintenanceRequestRepository]
})
export class MaintenanceModule {}
