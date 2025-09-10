import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { SupabaseModule } from '../database/supabase.module'

/**
 * ULTRA-NATIVE Dashboard Module
 * No service layers, forwardRef complexity, or circular dependencies
 * Direct Supabase RPC calls in controller
 */
@Module({
	imports: [SupabaseModule],
	controllers: [DashboardController]
})
export class DashboardModule {}
