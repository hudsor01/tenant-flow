import { Module, Global } from '@nestjs/common'
import { SupabaseService } from './supabase.service'
import { DatabaseOptimizationService } from './database-optimization.service'

@Global()
@Module({
	imports: [],
	providers: [SupabaseService, DatabaseOptimizationService],
	exports: [SupabaseService, DatabaseOptimizationService]
})
export class SupabaseModule {}
