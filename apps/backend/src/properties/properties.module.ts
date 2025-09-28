import { Module } from '@nestjs/common'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { SupabaseModule } from '../database/supabase.module'
import { RepositoriesModule } from '../repositories/repositories.module'
import { SharedModule } from '../shared/shared.module'

/**
 * Properties module - Refactored to use repository pattern
 * Uses repository abstractions for clean separation of concerns
 */
@Module({
	imports: [SupabaseModule, RepositoriesModule, SharedModule],
	controllers: [PropertiesController],
	providers: [PropertiesService],
	exports: [PropertiesService]
})
export class PropertiesModule {}
