import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { PDFModule } from '../pdf/pdf.module'
import { StripeModule } from '../billing/stripe.module'
import { DocuSealModule } from '../docuseal/docuseal.module'
import { EmailModule } from '../email/email.module'
import { SseModule } from '../notifications/sse/sse.module'
import { LeasesController } from './leases.controller'
import { LeaseAnalyticsController } from './lease-analytics.controller'
import { LeaseSignatureController } from './lease-signature.controller'
import { LeasePdfController } from './lease-pdf.controller'
import { LeasesPdfQueueController } from './leases-pdf-queue.controller'
import { LeasesService } from './leases.service'
import { LeaseFinancialService } from './lease-financial.service'
import { LeaseLifecycleService } from './lease-lifecycle.service'
import { LeaseTransformationService } from './lease-transformation.service'
import { LeaseValidationService } from './lease-validation.service'
import { LeaseExpiryCheckerService } from './lease-expiry-checker.service'
import { LeaseSignatureService } from './lease-signature.service'
import { LeaseSubscriptionService } from './lease-subscription.service'
import { LeaseQueryService } from './lease-query.service'
import { SubscriptionRetryService } from './subscription-retry.service'
import { SubscriptionAlertListener } from './listeners/subscription-alert.listener'
import { PdfGenerationProcessor } from '../pdf/pdf-generation.processor'
import { N8nPdfWebhookController } from '../pdf/n8n-pdf-webhook.controller'
import { N8nLeaseCronWebhookController } from './n8n-lease-cron-webhook.controller'
import { TenantsModule } from '../tenants/tenants.module'
import { SignatureValidationHelper } from './helpers/signature-validation.helper'
import { LeasePdfHelper } from './helpers/lease-pdf.helper'
import { SignatureNotificationHelper } from './helpers/signature-notification.helper'

/**
 * N8N Mode: When enabled, the n8n webhook controller handles PDF generation
 * via HTTP endpoints, allowing n8n to manage retries and orchestration.
 * BullMQ workers are disabled when using n8n mode.
 */
const N8N_PDF_MODE_ENABLED = process.env.N8N_PDF_MODE === 'true'
const N8N_CRON_MODE_ENABLED = process.env.N8N_CRON_MODE === 'true'
const WORKERS_ENABLED =
	process.env.BULLMQ_WORKERS_ENABLED !== 'false' &&
	process.env.BULLMQ_WORKERS_ENABLED !== '0'

/**
 * Leases module - Repository pattern implementation
 * Clean separation of concerns with repository layer
 *
 * Controllers (split per CLAUDE.md <300 line limit):
 * - LeasesController: Core CRUD operations
 * - LeaseAnalyticsController: Stats, analytics, expiring endpoints
 * - LeaseSignatureController: E-signature workflow endpoints
 * - LeasePdfController: PDF generation endpoints
 * - LeasesPdfQueueController: Async PDF queue operations
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
		SseModule, // For real-time signature update notifications
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
	controllers: [
		// IMPORTANT: LeaseAnalyticsController MUST come first - it has static routes
		// like /stats and /expiring that would otherwise be caught by LeasesController's /:id
		LeaseAnalyticsController,
		LeasesController,
		LeaseSignatureController,
		LeasePdfController,
		LeasesPdfQueueController,
		...(N8N_PDF_MODE_ENABLED ? [N8nPdfWebhookController] : []),
		...(N8N_CRON_MODE_ENABLED ? [N8nLeaseCronWebhookController] : [])
	],
	providers: [
		LeasesService,
		LeaseQueryService,
		LeaseFinancialService,
		LeaseLifecycleService,
		LeaseTransformationService,
		LeaseValidationService,
		LeaseExpiryCheckerService,
		SignatureValidationHelper,
		LeasePdfHelper,
		SignatureNotificationHelper,
		LeaseSignatureService,
		LeaseSubscriptionService, // Handles Stripe subscription creation (SRP split)
		SubscriptionRetryService, // Background job for retrying failed subscriptions
		SubscriptionAlertListener, // Event listener for subscription failure alerts
		// Only include PDF processor when NOT using n8n mode and workers are enabled
		...(WORKERS_ENABLED && !N8N_PDF_MODE_ENABLED ? [PdfGenerationProcessor] : [])
	],
	exports: [
		LeasesService,
		LeaseQueryService,
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
