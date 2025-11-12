import { Module } from '@nestjs/common'
import { TenantSettingsController } from './settings.controller'

/**
 * Tenant Settings Module
 *
 * Manages tenant profile and account settings.
 * Routes are prefixed with /tenant/settings via RouterModule.
 */
@Module({
	controllers: [TenantSettingsController]
})
export class TenantSettingsModule {}
