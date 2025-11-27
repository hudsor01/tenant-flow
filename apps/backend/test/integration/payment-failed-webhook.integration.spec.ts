import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { WebhookProcessor } from '../../src/modules/billing/webhook-processor.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { EmailService } from '../../src/modules/email/email.service'

describe('payment_intent.payment_failed integration', () => {
	let emailService: { sendPaymentFailedEmail: jest.Mock }
	let processor: WebhookProcessor
	let insertedTransaction: Record<string, unknown> | null

	beforeEach(async () => {
		insertedTransaction = null

		const rentPayment = { id: 'rent_123', tenant_id: 'tenant_123' }
		const rentPaymentsBuilder: any = { mode: 'select', error: null }
		rentPaymentsBuilder.select = jest.fn(() => rentPaymentsBuilder)
		rentPaymentsBuilder.update = jest.fn(() => {
			rentPaymentsBuilder.mode = 'update'
			return rentPaymentsBuilder
		})
		rentPaymentsBuilder.eq = jest.fn(() => {
			if (rentPaymentsBuilder.mode === 'update') return Promise.resolve({ error: null })
			return rentPaymentsBuilder
		})
		rentPaymentsBuilder.maybeSingle = jest.fn(async () => ({ data: rentPayment, error: null }))

		const tenantsBuilder: any = {}
		tenantsBuilder.select = jest.fn(() => tenantsBuilder)
		tenantsBuilder.eq = jest.fn(() => tenantsBuilder)
		tenantsBuilder.single = jest.fn(async () => ({
			data: { id: 'tenant_123', users: { email: 'tenant@example.com' } },
			error: null
		}))

		const paymentTransactionsBuilder: any = {
			insert: jest.fn(async (payload: any) => {
				insertedTransaction = payload
				return { data: null, error: null }
			})
		}

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'tenants') return tenantsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				return {}
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
	})

	it('dispatches failed intent and records transaction + email', async () => {
		const paymentIntent = {
			id: 'pi_failed_1',
			amount: 7500,
			currency: 'usd',
			metadata: { lease_id: 'lease_999', attempt_count: '3' },
			latest_charge: { receipt_url: 'https://example.com/receipt' },
			last_payment_error: { message: 'insufficient_funds' }
		} as unknown as Stripe.PaymentIntent

		await processor.processEvent({
			type: 'payment_intent.payment_failed',
			data: { object: paymentIntent }
		} as Stripe.Event)

		expect(insertedTransaction).toEqual(
			expect.objectContaining({
				rent_payment_id: 'rent_123',
				stripe_payment_intent_id: 'pi_failed_1',
				status: 'failed',
				amount: 7500,
				failure_reason: 'insufficient_funds'
			})
		)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledTimes(1)
		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				customerEmail: 'tenant@example.com',
				attemptCount: 3,
				isLastAttempt: true
			})
		)
	})
})
