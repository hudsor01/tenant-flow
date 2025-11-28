import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { WebhookProcessor, MAX_PAYMENT_RETRY_ATTEMPTS } from './webhook-processor.service'
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

	it(`marks isLastAttempt=true when attempt_count >= ${MAX_PAYMENT_RETRY_ATTEMPTS}`, async () => {
		await buildModule('tenant@example.com')

		const paymentIntent = buildPaymentIntent({
			metadata: { lease_id: 'lease_123', attempt_count: String(MAX_PAYMENT_RETRY_ATTEMPTS) }
		})

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				isLastAttempt: true,
				attemptCount: MAX_PAYMENT_RETRY_ATTEMPTS
			})
		)
	})

	it(`marks isLastAttempt=true when attempt_count exceeds ${MAX_PAYMENT_RETRY_ATTEMPTS}`, async () => {
		await buildModule('tenant@example.com')
		const exceededAttempts = MAX_PAYMENT_RETRY_ATTEMPTS + 2

		const paymentIntent = buildPaymentIntent({
			metadata: { lease_id: 'lease_123', attempt_count: String(exceededAttempts) }
		})

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				isLastAttempt: true,
				attemptCount: exceededAttempts
			})
		)
	})

	it('handles missing receipt_url gracefully (invoiceUrl=null)', async () => {
		await buildModule('tenant@example.com')

		const paymentIntent = buildPaymentIntent({
			latest_charge: null // No charge attached
		})

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				invoiceUrl: null
			})
		)
	})

	it('handles latest_charge as string ID (not expanded object)', async () => {
		await buildModule('tenant@example.com')

		const paymentIntent = buildPaymentIntent({
			latest_charge: 'ch_123' as any // String ID instead of expanded object
		})

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				invoiceUrl: null // Should be null when charge is not expanded
			})
		)
	})

	it('defaults attemptCount to 1 when metadata missing', async () => {
		await buildModule('tenant@example.com')

		const paymentIntent = buildPaymentIntent({
			metadata: { lease_id: 'lease_123' } // No attempt_count
		})

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				attemptCount: 1,
				isLastAttempt: false
			})
		)
	})

	it('does not send email when tenant query fails', async () => {
		const rentPayment = { id: 'rent_1', tenant_id: 'tenant_1' }

		const rentPaymentsBuilder = createRentPaymentsBuilder(rentPayment)
		const paymentTransactionsBuilder = createPaymentTransactionsBuilder(() => undefined)

		// Create a tenants builder that returns an error
		const tenantsBuilder: any = {}
		tenantsBuilder.select = jest.fn(() => tenantsBuilder)
		tenantsBuilder.eq = jest.fn(() => tenantsBuilder)
		tenantsBuilder.single = jest.fn(async () => ({
			data: null,
			error: { message: 'Database connection failed' }
		}))

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				if (table === 'tenants') return tenantsBuilder
				return { insert: jest.fn(() => ({ data: null, error: null })) }
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

		const paymentIntent = buildPaymentIntent()

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).not.toHaveBeenCalled()
	})

	it('does not send email when no rent_payment record found', async () => {
		// Create a rent_payments builder that returns null (no record found)
		const rentPaymentsBuilder: any = { error: null }
		rentPaymentsBuilder.select = jest.fn(() => rentPaymentsBuilder)
		rentPaymentsBuilder.update = jest.fn(() => rentPaymentsBuilder)
		rentPaymentsBuilder.eq = jest.fn(() => rentPaymentsBuilder)
		rentPaymentsBuilder.maybeSingle = jest.fn(async () => ({ data: null, error: null }))

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				return { insert: jest.fn(() => ({ data: null, error: null })) }
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

		const paymentIntent = buildPaymentIntent()

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).not.toHaveBeenCalled()
	})

	it('does not send email when tenant data structure is invalid (type guard fails)', async () => {
		const rentPayment = { id: 'rent_1', tenant_id: 'tenant_1' }

		const rentPaymentsBuilder = createRentPaymentsBuilder(rentPayment)
		const paymentTransactionsBuilder = createPaymentTransactionsBuilder(() => undefined)

		// Create a tenants builder that returns malformed data (missing users.email)
		const tenantsBuilder: any = {}
		tenantsBuilder.select = jest.fn(() => tenantsBuilder)
		tenantsBuilder.eq = jest.fn(() => tenantsBuilder)
		tenantsBuilder.single = jest.fn(async () => ({
			data: { id: 'tenant_1', users: { name: 'John' } }, // Missing email property
			error: null
		}))

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				if (table === 'tenants') return tenantsBuilder
				return { insert: jest.fn(() => ({ data: null, error: null })) }
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

		const paymentIntent = buildPaymentIntent()

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).not.toHaveBeenCalled()
	})

	it('does not send email when users object is null', async () => {
		const rentPayment = { id: 'rent_1', tenant_id: 'tenant_1' }

		const rentPaymentsBuilder = createRentPaymentsBuilder(rentPayment)
		const paymentTransactionsBuilder = createPaymentTransactionsBuilder(() => undefined)

		// Create a tenants builder that returns null users
		const tenantsBuilder: any = {}
		tenantsBuilder.select = jest.fn(() => tenantsBuilder)
		tenantsBuilder.eq = jest.fn(() => tenantsBuilder)
		tenantsBuilder.single = jest.fn(async () => ({
			data: { id: 'tenant_1', users: null },
			error: null
		}))

		const supabaseClient: any = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				if (table === 'tenants') return tenantsBuilder
				return { insert: jest.fn(() => ({ data: null, error: null })) }
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

		const paymentIntent = buildPaymentIntent()

		// @ts-expect-error accessing private for targeted test
		await processor.handlePaymentIntentFailed(paymentIntent)

		expect(emailService.sendPaymentFailedEmail).not.toHaveBeenCalled()
	})
})
