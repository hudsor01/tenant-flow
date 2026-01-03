import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { TenantPaymentsModule } from './payments/payments.module'
import { TenantAutopayModule } from './autopay/autopay.module'
import { TenantMaintenanceModule } from './maintenance/maintenance.module'
import { TenantLeasesModule } from './leases/leases.module'
import { TenantSettingsModule } from './settings/settings.module'
import { TenantAuthGuard } from './guards/tenant-auth.guard'
import { TenantContextInterceptor } from './interceptors/tenant-context.interceptor'
import { SupabaseModule } from '../../database/supabase.module'
import { TenantPortalController } from './tenant-portal.controller'

/**
 * Tenant Portal Module
 *
 * Parent module that organizes tenant-specific routes using RouterModule.
 * All routes are prefixed with /tenant and enforce TENANT user_type via TenantAuthGuard.
 *
 * Route Structure:
 * - /tenant-portal/*     - Main tenant portal endpoints (dashboard, leases, payments, etc.)
 * - /tenants/payments    - Payment history and methods
 * - /tenants/autopay     - Subscription management
 * - /tenants/maintenance - Maintenance requests
 * - /tenants/leases      - Lease info and documents
 * - /tenants/settings    - Profile and preferences
 *
 * Security:
 * - TenantAuthGuard validates TENANT user_type from database
 * - TenantContextInterceptor adds logging and context
 * - RLS policies enforce data access at database level
 *
 * @see TenantAuthGuard for user_type validation
 * @see TenantContextInterceptor for request logging
 * @see README.md for detailed documentation
 */
@Module({
	imports: [
		SupabaseModule,
		TenantPaymentsModule,
		TenantAutopayModule,
		TenantMaintenanceModule,
		TenantLeasesModule,
		TenantSettingsModule,
		RouterModule.register([
			{
				path: 'tenant-portal',
				children: [
					{ path: 'payments', module: TenantPaymentsModule },
					{ path: 'autopay', module: TenantAutopayModule },
					{ path: 'maintenance', module: TenantMaintenanceModule },
					{ path: 'leases', module: TenantLeasesModule },
					{ path: 'settings', module: TenantSettingsModule }
				]
			}
		])
	],
	controllers: [TenantPortalController],
	providers: [TenantAuthGuard, TenantContextInterceptor],
	exports: [TenantAuthGuard, TenantContextInterceptor]
})
export class TenantPortalModule {}
