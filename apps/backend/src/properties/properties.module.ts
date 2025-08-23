import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { SupabaseModule } from '../database/supabase.module'
import { CommonModule } from '../shared/common.module'

/**
 * Properties module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [SupabaseModule, CommonModule],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}
