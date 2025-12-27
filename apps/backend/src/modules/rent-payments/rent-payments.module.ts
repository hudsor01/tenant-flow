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

// Decomposed services
import { RentPaymentQueryService } from './rent-payment-query.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'
import { PaymentAnalyticsService } from './payment-analytics.service'
import { PaymentReminderService } from './payment-reminder.service'

// Facade service
import { RentPaymentsService } from './rent-payments.service'

@Module({
	imports: [
		StripeModule,
		BullModule.registerQueue({
			name: 'emails'
		})
	],
	controllers: [RentPaymentsController],
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
