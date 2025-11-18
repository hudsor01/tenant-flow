import { Logger, Module } from '@nestjs/common'
import { StorageService } from '../../database/storage.service'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertyImagesService } from './services/property-images.service'
import { PropertyBulkImportService } from './services/property-bulk-import.service'
import { PropertyAnalyticsService } from './services/property-analytics.service'

/**
 * Properties module - Refactored to use repository pattern
 * Uses repository abstractions for clean separation of concerns
 */
@Module({
	imports: [SupabaseModule, SharedModule],
	controllers: [PropertiesController],
	providers: [
		PropertiesService,
		PropertyImagesService,
		PropertyBulkImportService,
		PropertyAnalyticsService,
		StorageService,
		Logger
	],
	exports: [PropertiesService]
})
export class PropertiesModule {}
