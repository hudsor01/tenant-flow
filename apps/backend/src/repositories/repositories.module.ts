import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { AnalyticsModule } from '../modules/analytics/analytics.module'
import { SupabaseActivityRepository } from './supabase/supabase-activity.repository'
import { SupabaseBillingRepository } from './supabase/supabase-billing.repository'
import { SupabaseDashboardRepository } from './supabase/supabase-dashboard.repository'
import { SupabaseLeasesRepository } from './supabase/supabase-leases.repository'
import { SupabaseMaintenanceRepository } from './supabase/supabase-maintenance.repository'
import { SupabasePropertiesRepository } from './supabase/supabase-properties.repository'
import { SupabaseSecurityRepository } from './supabase/supabase-security.repository'
import { SupabaseTenantsRepository } from './supabase/supabase-tenants.repository'
import { SupabaseUnitsRepository } from './supabase/supabase-units.repository'

/**
 * Repository provider tokens for dependency injection
 * Use these string tokens when injecting repositories into services
 */
export const REPOSITORY_TOKENS = {
	PROPERTIES: 'IPropertiesRepository',
	DASHBOARD: 'IDashboardRepository',
	TENANTS: 'ITenantsRepository',
	UNITS: 'IUnitsRepository',
	LEASES: 'ILeasesRepository',
	MAINTENANCE: 'IMaintenanceRepository',
	ACTIVITY: 'IActivityRepository',
	BILLING: 'IBillingRepository',
	SECURITY: 'ISecurityRepository'
} as const

/**
 * Repositories module
 * Configures dependency injection for all repository implementations
 */
@Module({
	imports: [SupabaseModule, AnalyticsModule],
	providers: [
		// Properties repository
		{
			provide: REPOSITORY_TOKENS.PROPERTIES,
			useClass: SupabasePropertiesRepository
		},
		// Dashboard repository
		{
			provide: REPOSITORY_TOKENS.DASHBOARD,
			useClass: SupabaseDashboardRepository
		},
		// Tenants repository
		{
			provide: REPOSITORY_TOKENS.TENANTS,
			useClass: SupabaseTenantsRepository
		},
		// Units repository
		{
			provide: REPOSITORY_TOKENS.UNITS,
			useClass: SupabaseUnitsRepository
		},
		// Leases repository
		{
			provide: REPOSITORY_TOKENS.LEASES,
			useClass: SupabaseLeasesRepository
		},
		// Maintenance repository
		{
			provide: REPOSITORY_TOKENS.MAINTENANCE,
			useClass: SupabaseMaintenanceRepository
		},
		// Activity repository
		{
			provide: REPOSITORY_TOKENS.ACTIVITY,
			useClass: SupabaseActivityRepository
		},
		// Billing repository
		{
			provide: REPOSITORY_TOKENS.BILLING,
			useClass: SupabaseBillingRepository
		},
		// Security repository
		{
			provide: REPOSITORY_TOKENS.SECURITY,
			useClass: SupabaseSecurityRepository
		}
	],
	exports: [
		REPOSITORY_TOKENS.PROPERTIES,
		REPOSITORY_TOKENS.DASHBOARD,
		REPOSITORY_TOKENS.TENANTS,
		REPOSITORY_TOKENS.UNITS,
		REPOSITORY_TOKENS.LEASES,
		REPOSITORY_TOKENS.MAINTENANCE,
		REPOSITORY_TOKENS.ACTIVITY,
		REPOSITORY_TOKENS.BILLING,
		REPOSITORY_TOKENS.SECURITY
	]
})
export class RepositoriesModule {}
