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
import { PropertyAccessService } from './services/property-access.service'

// Analytics sub-services (extracted Jan 2026)
import { OccupancyAnalyticsService } from './services/analytics/occupancy-analytics.service'
import { FinancialAnalyticsService } from './services/analytics/financial-analytics.service'

/**
 * Properties module
 * Image uploads handled directly via Supabase Storage + RLS (Dec 2025 best practice)
 *
 * Analytics decomposed into focused services (Jan 2026):
 * - PropertyAnalyticsService: Orchestrator + performance/maintenance analytics
 * - OccupancyAnalyticsService: Occupancy rates and trends
 * - FinancialAnalyticsService: Revenue, expenses, profit metrics
 */
@Module({
	imports: [SupabaseModule, SharedModule, DashboardModule],
	controllers: [PropertiesController, PropertyAnalyticsController],
	providers: [
		PropertiesService,
		PropertyLifecycleService,
		PropertyCacheInvalidationService,
		PropertyBulkImportService,
		PropertyAnalyticsService,
		PropertyAccessService,
		OccupancyAnalyticsService,
		FinancialAnalyticsService
	],
	exports: [PropertiesService, PropertyAccessService]
})
export class PropertiesModule {}
