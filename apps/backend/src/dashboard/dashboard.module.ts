import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { SupabaseModule } from '../database/supabase.module'

/**
 * Dashboard Module - Proper NestJS Service Layer Pattern
 * Controller → Service → Database
 * DashboardService handles all business logic and RPC calls
 */
@Module({
	imports: [SupabaseModule],
	controllers: [DashboardController],
	providers: [DashboardService]
})
export class DashboardModule {}
