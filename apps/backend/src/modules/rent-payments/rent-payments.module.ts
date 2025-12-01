/**
 * Rent Payments Module - Refactored with Decomposed Services
 *
 * Architecture:
 * RentPaymentsService (Facade) → Delegates to specialized services
 * ├─ RentPaymentQueryService (payment history queries)
 * ├─ RentPaymentAutopayService (autopay setup, cancel, status)
 * └─ RentPaymentContextService (tenant and lease context loading)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service
 * - Independent development
 * - Clear dependency graph
 */

import { Module } from '@nestjs/common'
import { StripeModule } from '../billing/stripe.module'
import { RentPaymentsController } from './rent-payments.controller'

// Decomposed services
import { RentPaymentQueryService } from './rent-payment-query.service'
import { RentPaymentAutopayService } from './rent-payment-autopay.service'
import { RentPaymentContextService } from './rent-payment-context.service'

// Facade service
import { RentPaymentsService } from './rent-payments.service'

@Module({
	imports: [StripeModule],
	controllers: [RentPaymentsController],
	providers: [
		// Context service (no dependencies on other rent-payment services)
		RentPaymentContextService,
		// Query service (depends on Context)
		RentPaymentQueryService,
		// Autopay service (depends on Context)
		RentPaymentAutopayService,
		// Facade service (coordinates all services)
		RentPaymentsService
	],
	exports: [
		// Export specialized services for direct use if needed
		RentPaymentQueryService,
		RentPaymentAutopayService,
		RentPaymentContextService,
		// Export facade (main entry point)
		RentPaymentsService
	]
})
export class RentPaymentsModule {}
