import { Logger, Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { StripeModule } from '../billing/stripe.module'
import { DocuSealModule } from '../docuseal/docuseal.module'
import { EmailModule } from '../email/email.module'
import { LeasesController } from './leases.controller'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { LeaseSignatureService } from './lease-signature.service'
import { SubscriptionRetryService } from './subscription-retry.service'
import { SubscriptionAlertListener } from './listeners/subscription-alert.listener'
import { TenantsModule } from '../tenants/tenants.module'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 *
 * Lease Lifecycle:
 * 1. Create lease (draft status)
 * 2. Send for signature (pending_signature)
 * 3. Owner signs
 * 4. Tenant signs
 * 5. Both signed → active, Stripe subscription created
 *
 * Subscription Creation:
 * - Database-first approach: Lease activates immediately with 'pending' subscription
 * - Stripe subscription created asynchronously with retry capability
 * - Background job (SubscriptionRetryService) handles failed subscriptions
 * - Alerts (SubscriptionAlertListener) notify on max retries reached
 */
@Module({
	imports: [
		SupabaseModule,
		TenantsModule,
		PDFModule, // For lease PDF generation
		SharedModule,
		StripeModule, // For billing when lease is activated
		DocuSealModule, // For e-signature via self-hosted DocuSeal
		EmailModule // For subscription failure alerts
	],
	controllers: [LeasesController],
	providers: [
		Logger,
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseExpiryCheckerService,
		LeaseSignatureService,
		SubscriptionRetryService, // Background job for retrying failed subscriptions
		SubscriptionAlertListener // Event listener for subscription failure alerts
	],
	exports: [
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseSignatureService,
		SubscriptionRetryService
	]
})
export class LeasesModule {}
