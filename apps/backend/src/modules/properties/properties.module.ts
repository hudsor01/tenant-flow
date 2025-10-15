import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'

/**
 * Properties module - Refactored to use repository pattern
 * Uses repository abstractions for clean separation of concerns
 */
@Module({
	imports: [SupabaseModule, SharedModule],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}
