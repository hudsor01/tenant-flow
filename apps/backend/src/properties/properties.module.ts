import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { SupabaseModule } from '../database/supabase.module'
import { SharedModule } from '../shared/shared.module'

/**
 * Properties module - Simplified with direct Supabase usage
 * No repositories, minimal dependencies
 */
@Module({
	imports: [SupabaseModule, SharedModule],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}
