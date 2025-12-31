import { Test } from '@nestjs/testing'
import { getQueueToken } from '@nestjs/bullmq'
import type Stripe from 'stripe'
import { WebhookProcessor } from '../../src/modules/billing/webhook-processor.service'
import { SupabaseService } from '../../src/database/supabase.service'
import { EmailService } from '../../src/modules/email/email.service'
import { PaymentWebhookHandler } from '../../src/modules/billing/handlers/payment-webhook.handler'
import { SubscriptionWebhookHandler } from '../../src/modules/billing/handlers/subscription-webhook.handler'
import { CheckoutWebhookHandler } from '../../src/modules/billing/handlers/checkout-webhook.handler'
import { ConnectWebhookHandler } from '../../src/modules/billing/handlers/connect-webhook.handler'
import { AppLogger } from '../../src/logger/app-logger.service'
import { SseService } from '../../src/modules/notifications/sse/sse.service'

describe('payment_intent.payment_failed integration', () => {
	let emailService: { sendPaymentFailedEmail: jest.Mock }
	let processor: WebhookProcessor
	let insertedTransaction: Record<string, unknown> | null
	let emailQueue: { add: jest.Mock }

	beforeEach(async () => {
		insertedTransaction = null

		const rentPayment = { id: 'rent_123', tenant_id: 'tenant_123' }
		const rentPaymentsBuilder: {
			mode: 'select' | 'update'
			error: null
			select: jest.Mock
			update: jest.Mock
			eq: jest.Mock
			maybeSingle: jest.Mock
		} = {
			mode: 'select',
			error: null,
			select: jest.fn(),
			update: jest.fn(),
			eq: jest.fn(),
			maybeSingle: jest.fn()
		}
		rentPaymentsBuilder.select = jest.fn(() => rentPaymentsBuilder)
		rentPaymentsBuilder.update = jest.fn(() => {
			rentPaymentsBuilder.mode = 'update'
			return rentPaymentsBuilder
		})
		rentPaymentsBuilder.eq = jest.fn(() => {
			if (rentPaymentsBuilder.mode === 'update')
				return Promise.resolve({ error: null })
			return rentPaymentsBuilder
		})
		rentPaymentsBuilder.maybeSingle = jest.fn(async () => ({
			data: rentPayment,
			error: null
		}))

		const tenantsBuilder: {
			select: jest.Mock
			eq: jest.Mock
			single: jest.Mock
		} = { select: jest.fn(), eq: jest.fn(), single: jest.fn() }
		tenantsBuilder.select = jest.fn(() => tenantsBuilder)
		tenantsBuilder.eq = jest.fn(() => tenantsBuilder)
		tenantsBuilder.single = jest.fn(async () => ({
			data: { id: 'tenant_123', users: { email: 'tenant@example.com' } },
			error: null
		}))

		const paymentTransactionsBuilder: {
			insert: jest.Mock
			upsert: jest.Mock
		} = {
			insert: jest.fn(async (payload: Record<string, unknown>) => {
				insertedTransaction = payload
				return { data: null, error: null }
			}),
			upsert: jest.fn(async (payload: Record<string, unknown>) => {
				insertedTransaction = payload
				return { data: null, error: null }
			})
		}

		const supabaseClient = {
			from: jest.fn((table: string) => {
				if (table === 'rent_payments') return rentPaymentsBuilder
				if (table === 'tenants') return tenantsBuilder
				if (table === 'payment_transactions') return paymentTransactionsBuilder
				return {}
			})
		} as unknown as ReturnType<SupabaseService['getAdminClient']>

		emailService = {
			sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined)
		}

		// Mock handlers that aren't being tested
		const mockSubscriptionHandler = {
			handleSubscriptionCreated: jest.fn(),
			handleSubscriptionUpdated: jest.fn(),
			handleSubscriptionDeleted: jest.fn()
		}

		const mockCheckoutHandler = {
			handleCheckoutCompleted: jest.fn()
		}

		const mockConnectHandler = {
			handleAccountUpdated: jest.fn()
		}

		const mockAppLogger = {
			log: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn()
		}

		const mockSseService = {
			broadcast: jest.fn(),
			broadcastToUser: jest.fn(),
			broadcastToUsers: jest.fn()
		}

		const mockEmailQueue = {
			add: jest.fn()
		}
		emailQueue = mockEmailQueue

		const moduleRef = await Test.createTestingModule({
			providers: [
				WebhookProcessor,
				PaymentWebhookHandler,
				{
					provide: SupabaseService,
					useValue: { getAdminClient: () => supabaseClient }
				},
				{ provide: EmailService, useValue: emailService },
				{ provide: SseService, useValue: mockSseService },
				{ provide: getQueueToken('emails'), useValue: mockEmailQueue },
				{
					provide: SubscriptionWebhookHandler,
					useValue: mockSubscriptionHandler
				},
				{ provide: CheckoutWebhookHandler, useValue: mockCheckoutHandler },
				{ provide: ConnectWebhookHandler, useValue: mockConnectHandler },
				{ provide: AppLogger, useValue: mockAppLogger }
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

		expect(emailQueue.add).toHaveBeenCalledTimes(1)
		expect(emailQueue.add).toHaveBeenCalledWith(
			'payment-failed',
			expect.objectContaining({
				type: 'payment-failed',
				data: expect.objectContaining({
					customerEmail: 'tenant@example.com',
					attemptCount: 3,
					isLastAttempt: true
				})
			})
		)
	})
})
