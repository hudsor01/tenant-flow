import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceController } from './maintenance.controller'
import { SupabaseService } from '../common/supabase.service'
// PrismaModule is now global from nestjs-prisma

@Module({
	imports: [
		ConfigModule
	],
	controllers: [MaintenanceController],
	providers: [MaintenanceService, SupabaseService],
	exports: [MaintenanceService]
})
export class MaintenanceModule {}
