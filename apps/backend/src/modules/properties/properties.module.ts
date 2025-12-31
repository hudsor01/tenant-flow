import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { DashboardModule } from '../dashboard/dashboard.module'

// Controllers
import { PropertiesController } from './properties.controller'
import { PropertyAnalyticsController } from './property-analytics.controller'

// Services
import { PropertiesService } from './properties.service'
import { PropertyBulkImportService } from './services/property-bulk-import.service'
import { PropertyAnalyticsService } from './services/property-analytics.service'
import { PropertyLifecycleService } from './services/property-lifecycle.service'
import { PropertyCacheInvalidationService } from './services/property-cache-invalidation.service'

/**
 * Properties module
 * Image uploads handled directly via Supabase Storage + RLS (Dec 2025 best practice)
 *
 * Analytics consolidated into single PropertyAnalyticsService (Dec 2025)
 */
@Module({
	imports: [SupabaseModule, SharedModule, DashboardModule],
	controllers: [PropertiesController, PropertyAnalyticsController],
	providers: [
		PropertiesService,
		PropertyLifecycleService,
		PropertyCacheInvalidationService,
		PropertyBulkImportService,
		PropertyAnalyticsService
	],
	exports: [PropertiesService]
})
export class PropertiesModule {}
