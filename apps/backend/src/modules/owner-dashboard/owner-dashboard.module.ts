import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { FinancialModule } from './financial/financial.module'
import { PropertiesModule } from './properties/properties.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { TenantsModule } from './tenants/tenants.module'
import { ReportsModule } from './reports/reports.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { OwnerContextInterceptor } from './interceptors/owner-context.interceptor'

/**
 * OwnerDashboardModule
 *
 * Parent module for owner dashboard functionality.
 * Organizes routes under /owner prefix with 6 child modules:
 *
 * Route Structure:
 * - /owner/financial/*      - Financial analytics and billing
 * - /owner/properties/*     - Property performance
 * - /owner/maintenance/*    - Maintenance analytics
 * - /owner/tenants/*        - Tenant and occupancy stats
 * - /owner/reports/*        - Reports and trends
 * - /owner/analytics/*      - Dashboard stats and activity
 *
 * Guards & Interceptors:
 * - RolesGuard: Ensures user has OWNER role via JWT claims
 * - OwnerContextInterceptor: Adds owner context to requests
 *
 * Usage in app.module.ts:
 * imports: [OwnerDashboardModule]
 */
@Module({
	imports: [
		// Child modules
		FinancialModule,
		PropertiesModule,
		MaintenanceModule,
		TenantsModule,
		ReportsModule,
		AnalyticsModule,

		// RouterModule configuration for /owner route group
		RouterModule.register([
			{
				path: 'owner',
				children: [
					{ path: 'financial', module: FinancialModule },
					{ path: 'properties', module: PropertiesModule },
					{ path: 'maintenance', module: MaintenanceModule },
					{ path: 'tenants', module: TenantsModule },
					{ path: 'reports', module: ReportsModule },
					{ path: 'analytics', module: AnalyticsModule }
				]
			}
		])
	],
	providers: [OwnerContextInterceptor],
	exports: [OwnerContextInterceptor]
})
export class OwnerDashboardModule {}
