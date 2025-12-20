import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { StripeModule } from '../billing/stripe.module'
import { DocuSealModule } from '../docuseal/docuseal.module'
import { EmailModule } from '../email/email.module'
import { LeasesController } from './leases.controller'
import { LeasesPdfQueueController } from './leases-pdf-queue.controller'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { LeaseSignatureService } from './lease-signature.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import { SubscriptionRetryService } from './subscription-retry.service'
import { SubscriptionAlertListener } from './listeners/subscription-alert.listener'
import { PdfGenerationProcessor } from '../pdf/pdf-generation.processor'
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
		EmailModule, // For subscription failure alerts
		BullModule.registerQueue({
			name: 'pdf-generation',
			defaultJobOptions: {
				removeOnComplete: 100, // Keep last 100 successful jobs for debugging
				attempts: 3, // Retry failed jobs 3 times
				backoff: {
					type: 'exponential',
					delay: 5000 // Start with 5s, then 10s, then 20s
				}
			}
		})
	],
	controllers: [LeasesController, LeasesPdfQueueController],
	providers: [
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseExpiryCheckerService,
		LeaseSignatureService,
		LeaseSubscriptionService, // Handles Stripe subscription creation (SRP split)
		SubscriptionRetryService, // Background job for retrying failed subscriptions
		SubscriptionAlertListener, // Event listener for subscription failure alerts
		PdfGenerationProcessor // Queue processor for async PDF generation
	],
	exports: [
		LeasesService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseSignatureService,
		LeaseSubscriptionService,
		SubscriptionRetryService
	]
})
export class LeasesModule {}
