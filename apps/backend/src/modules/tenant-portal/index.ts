/**
 * Tenant Portal Module Exports
 *
 * Central export point for tenant-facing functionality.
 * Use this barrel file for cleaner imports across the application.
 */

// Parent module
export { TenantPortalModule } from './tenant-portal.module'

// Child modules
export { TenantPaymentsModule } from './payments/payments.module'
export { TenantAutopayModule } from './autopay/autopay.module'
export { TenantMaintenanceModule } from './maintenance/maintenance.module'
export { TenantLeasesModule } from './leases/leases.module'
export { TenantSettingsModule } from './settings/settings.module'

// Guards
export { TenantAuthGuard } from './guards/tenant-auth.guard'

// Interceptors
export {
	TenantContextInterceptor,
	type TenantContext
} from './interceptors/tenant-context.interceptor'

// Controllers (for testing)
export { TenantPaymentsController } from './payments/payments.controller'
export { TenantAutopayController } from './autopay/autopay.controller'
export { TenantMaintenanceController } from './maintenance/maintenance.controller'
export { TenantLeasesController } from './leases/leases.controller'
export { TenantSettingsController } from './settings/settings.controller'
