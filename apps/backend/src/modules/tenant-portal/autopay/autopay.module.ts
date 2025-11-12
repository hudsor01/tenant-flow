import { Module } from '@nestjs/common'
import { TenantAutopayController } from './autopay.controller'

/**
 * Tenant Autopay Module
 *
 * Manages automatic payment subscriptions and recurring payments for tenants.
 * Routes are prefixed with /tenant/autopay via RouterModule.
 */
@Module({
	controllers: [TenantAutopayController]
})
export class TenantAutopayModule {}
