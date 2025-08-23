import { Module } from '@nestjs/common'
import { SupabaseService } from './supabase.service'
import { DatabaseOptimizationService } from './database-optimization.service'

@Module({
	providers: [SupabaseService, DatabaseOptimizationService],
	exports: [SupabaseService, DatabaseOptimizationService]
})
export class SupabaseModule {}
