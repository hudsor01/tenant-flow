import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../../database/supabase.module'

import { ConnectController } from './connect.controller'
import { PayoutsController } from './payouts.controller'
import { ConnectService } from './connect.service'
import { ConnectSetupService } from './connect-setup.service'
import { ConnectBillingService } from './connect-billing.service'
import { ConnectPayoutsService } from './connect-payouts.service'
import { StripeSharedService } from '../stripe-shared.service'

/**
 * Connect Module
 *
 * Handles Stripe Connect functionality for multi-tenant payments:
 * - ConnectSetupService: Account creation and onboarding
 * - ConnectBillingService: Customer and subscription management
 * - ConnectPayoutsService: Balance, payouts, and transfers
 * - ConnectService: Facade for the above services
 *
 * Controllers:
 * - ConnectController: Account management operations
 * - PayoutsController: Payout and transfer operations
 *
 * Extracted from StripeModule for better SRP.
 */
@Module({
	imports: [SupabaseModule],
	controllers: [ConnectController, PayoutsController],
	providers: [
		ConnectService,
		ConnectSetupService,
		ConnectBillingService,
		ConnectPayoutsService,
		StripeSharedService
	],
	exports: [
		ConnectService,
		ConnectSetupService,
		ConnectBillingService,
		ConnectPayoutsService
	]
})
export class ConnectModule {}
