import { Module } from '@nestjs/common'
import { TenantPaymentsController } from './payments.controller'

/**
 * Tenant Payments Module
 *
 * Handles payment history and payment method management for tenants.
 * Routes are prefixed with /tenant/payments via RouterModule.
 */
@Module({
	controllers: [TenantPaymentsController]
})
export class TenantPaymentsModule {}
