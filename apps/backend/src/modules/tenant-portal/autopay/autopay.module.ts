import { Module } from '@nestjs/common'
import { TenantAutopayController } from './autopay.controller'
import { RentPaymentsModule } from '../../rent-payments/rent-payments.module'

/**
 * Tenant Autopay Module
 *
 * Manages automatic payment subscriptions and recurring payments for tenants.
 * Routes are prefixed with /tenant/autopay via RouterModule.
 */
@Module({
	imports: [RentPaymentsModule],
	controllers: [TenantAutopayController]
})
export class TenantAutopayModule {}
