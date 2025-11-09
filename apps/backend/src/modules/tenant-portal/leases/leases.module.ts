import { Module } from '@nestjs/common'
import { TenantLeasesController } from './leases.controller'

/**
 * Tenant Leases Module
 *
 * Provides lease information and documents for tenants.
 * Routes are prefixed with /tenant/leases via RouterModule.
 */
@Module({
	controllers: [TenantLeasesController]
})
export class TenantLeasesModule {}
