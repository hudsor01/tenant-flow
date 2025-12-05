import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { DashboardModule } from '../dashboard/dashboard.module'
import { PropertiesController } from './properties.controller'
import { PropertiesService } from './properties.service'
import { PropertyBulkImportService } from './services/property-bulk-import.service'
import { PropertyAnalyticsService } from './services/property-analytics.service'
import { PropertyOccupancyAnalyticsService } from './services/property-occupancy-analytics.service'
import { PropertyFinancialAnalyticsService } from './services/property-financial-analytics.service'
import { PropertyMaintenanceAnalyticsService } from './services/property-maintenance-analytics.service'

/**
 * Properties module
 * Image uploads handled directly via Supabase Storage + RLS (Dec 2025 best practice)
 */
@Module({
	imports: [SupabaseModule, SharedModule, DashboardModule],
	controllers: [PropertiesController],
	providers: [
		PropertiesService,
		PropertyBulkImportService,
		PropertyOccupancyAnalyticsService,
		PropertyFinancialAnalyticsService,
		PropertyMaintenanceAnalyticsService,
		PropertyAnalyticsService
	],
	exports: [PropertiesService]
})
export class PropertiesModule {}
