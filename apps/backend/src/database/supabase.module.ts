import { Module, Global } from '@nestjs/common'
import { LoggerModule } from 'nestjs-pino'
import { SupabaseService } from './supabase.service'
import { DatabaseOptimizationService } from './database-optimization.service'

@Global()
@Module({
	imports: [LoggerModule],
	providers: [SupabaseService, DatabaseOptimizationService],
	exports: [SupabaseService, DatabaseOptimizationService]
})
export class SupabaseModule {}
