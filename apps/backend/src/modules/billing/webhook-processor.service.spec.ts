import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { WebhookProcessor } from './webhook-processor.service'
import { SupabaseService } from '../../database/supabase.service'
import { EmailService } from '../email/email.service'

const createRentPaymentsBuilder = (rentPayment: { id: string; tenant_id: string }) => {
	const builder: any = { error: null }
	builder.select = jest.fn(() => builder)
	builder.update = jest.fn(() => builder)
	builder.eq = jest.fn(() => builder)
	builder.maybeSingle = jest.fn(async () => ({ data: rentPayment, error: null }))
	return builder
}

const createPaymentTransactionsBuilder = (onInsert: (payload: any) => void) => {
	return {
		insert: jest.fn(async (payload: any) => {
			onInsert(payload)
			return { data: null, error: null }
		})
	}
}

const createTenantsBuilder = (tenantEmail: string | null) => {
	const builder: any = {}
	builder.select = jest.fn(() => builder)
	builder.eq = jest.fn(() => builder)
	builder.single = jest.fn(async () => ({
		data: tenantEmail ? { id: 'tenant_1', users: { email: tenantEmail } } : { id: 'tenant_1' },
		error: null
	}))
	return builder
}

describe('WebhookProcessor handlePaymentIntentFailed', () => {
	let processor: WebhookProcessor
	let emailService: { sendPaymentFailedEmail: jest.Mock }

	const buildModule = async (tenantEmail: string | null = 'tenant@example.com') => {
		const rentPayment = { id: 'rent_1', tenant_id: 'tenant_1' }

		const rentPaymentsBuilder = createRentPaymentsBuilder(rentPayment)
		const paymentTransactionsBuilder = createPaymentTransactionsBuilder(() => undefined)
		const tenantsBuilder = createTenantsBuilder(tenantEmail)

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				if (table === 'tenants') return tenantsBuilder
				return {
					insert: jest.fn(() => ({ data: null, error: null }))
				}
			})
		}

		emailService = {
			sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined)
		}

		const moduleRef = await Test.createTestingModule({
			providers: [
				WebhookProcessor,
				{ provide: SupabaseService, useValue: { getAdminClient: () => supabaseClient } },
				{ provide: EmailService, useValue: emailService }
			]
		}).compile()

		moduleRef.useLogger(false)
		processor = moduleRef.get(WebhookProcessor)

		return { rentPaymentsBuilder, paymentTransactionsBuilder, tenantsBuilder }
	}

	const buildPaymentIntent = (overrides: Partial<Stripe.PaymentIntent> = {}): Stripe.PaymentIntent => ({
		id: 'pi_123',
		amount: 5000,
		currency: 'usd',
		metadata: { lease_id: 'lease_123', attempt_count: '2' },
		latest_charge: { receipt_url: 'https://example.com/receipt' } as any,
		last_payment_error: { message: 'card_declined' } as any,
		...overrides
	} as Stripe.PaymentIntent)

	it('sends payment failed email with derived fields', async () => {
		await buildModule('tenant@example.com')

		const paymentIntent = buildPaymentIntent()

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledTimes(1)
		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith({
			customerEmail: 'tenant@example.com',
			amount: 5000,
			currency: 'usd',
			attemptCount: 2,
			invoiceUrl: 'https://example.com/receipt',
			isLastAttempt: false
		})
	})

	it('does not attempt email when tenant email missing', async () => {
		await buildModule(null)

		const paymentIntent = buildPaymentIntent({ metadata: { lease_id: 'lease_123', attempt_count: '3' } })

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).not.toHaveBeenCalled()
	})
})
