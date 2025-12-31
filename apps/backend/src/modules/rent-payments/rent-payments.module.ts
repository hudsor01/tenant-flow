/**
 * Rent Payments Module - Refactored with Decomposed Services
 *
 * Architecture:
 * RentPaymentsService (Facade) → Delegates to specialized services
 * ├─ RentPaymentQueryService (payment history queries)
 * ├─ RentPaymentAutopayService (autopay setup, cancel, status)
 * ├─ RentPaymentContextService (tenant and lease context loading)
 * ├─ PaymentAnalyticsService (analytics, trends, CSV export)
 * └─ PaymentReminderService (scheduled payment reminder emails)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service
 * - Independent development
 * - Clear dependency graph
 */

import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { StripeModule } from '../billing/stripe.module'
import { RentPaymentsController } from './rent-payments.controller'
import { N8nPaymentReminderWebhookController } from './n8n-payment-reminder-webhook.controller'

// Decomposed services
import { RentPaymentQueryService } from './rent-payment-query.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { PaymentAnalyticsService } from './payment-analytics.service'
import { PaymentReminderService } from './payment-reminder.service'

// Facade service
import { RentPaymentsService } from './rent-payments.service'

/**
 * N8N Cron Mode: When enabled, exposes HTTP endpoint for n8n to trigger
 * payment reminders instead of using @Cron decorator.
 */
const N8N_CRON_MODE_ENABLED = process.env.N8N_CRON_MODE === 'true'

@Module({
	imports: [
		StripeModule,
		BullModule.registerQueue({
			name: 'emails'
		})
	],
	controllers: [
		RentPaymentsController,
		...(N8N_CRON_MODE_ENABLED ? [N8nPaymentReminderWebhookController] : [])
	],
	providers: [
		// Context service (no dependencies on other rent-payment services)
		RentPaymentContextService,
		// Query service (depends on Context)
		RentPaymentQueryService,
		// Autopay service (depends on Context)
		RentPaymentAutopayService,
		// Analytics service (payment metrics and trends)
		PaymentAnalyticsService,
		// Payment reminder scheduler
		PaymentReminderService,
		// Facade service (coordinates all services)
		RentPaymentsService
	],
	exports: [
		// Export specialized services for direct use if needed
		RentPaymentQueryService,
		RentPaymentAutopayService,
		RentPaymentContextService,
		PaymentAnalyticsService,
		PaymentReminderService,
		// Export facade (main entry point)
		RentPaymentsService
	]
})
export class RentPaymentsModule {}
