import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { WebhookProcessor } from './webhook-processor.service'
import { SubscriptionWebhookHandler } from './handlers/subscription-webhook.handler'
import { PaymentWebhookHandler } from './handlers/payment-webhook.handler'
import { CheckoutWebhookHandler } from './handlers/checkout-webhook.handler'
import { ConnectWebhookHandler } from './handlers/connect-webhook.handler'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('WebhookProcessor', () => {
	let processor: WebhookProcessor
	let mockSubscriptionHandler: jest.Mocked<Partial<SubscriptionWebhookHandler>>
	let mockPaymentHandler: jest.Mocked<Partial<PaymentWebhookHandler>>
	let mockCheckoutHandler: jest.Mocked<Partial<CheckoutWebhookHandler>>
	let mockConnectHandler: jest.Mocked<Partial<ConnectWebhookHandler>>

	beforeEach(async () => {
		mockSubscriptionHandler = {
			handleSubscriptionCreated: jest.fn().mockResolvedValue(undefined),
			handleSubscriptionUpdated: jest.fn().mockResolvedValue(undefined),
			handleSubscriptionDeleted: jest.fn().mockResolvedValue(undefined)
		}

		mockPaymentHandler = {
			handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(undefined),
			handlePaymentIntentFailed: jest.fn().mockResolvedValue(undefined),
			handlePaymentFailed: jest.fn().mockResolvedValue(undefined),
			handlePaymentAttached: jest.fn().mockResolvedValue(undefined)
		}

		mockCheckoutHandler = {
			handleCheckoutCompleted: jest.fn().mockResolvedValue(undefined)
		}

		mockConnectHandler = {
			handleAccountUpdated: jest.fn().mockResolvedValue(undefined)
		}

		const moduleRef = await Test.createTestingModule({
			providers: [
				WebhookProcessor,
				{
					provide: SubscriptionWebhookHandler,
					useValue: mockSubscriptionHandler
				},
				{ provide: PaymentWebhookHandler, useValue: mockPaymentHandler },
				{ provide: CheckoutWebhookHandler, useValue: mockCheckoutHandler },
				{ provide: ConnectWebhookHandler, useValue: mockConnectHandler },
				{
					provide: AppLogger,
					useValue: new SilentLogger()
				}
			]
		}).compile()

		moduleRef.useLogger(false)
		processor = moduleRef.get(WebhookProcessor)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	const createEvent = (type: string, data: unknown = {}): Stripe.Event =>
		({
			id: 'evt_test',
			object: 'event',
			type,
			data: { object: data },
			api_version: '2024-04-10',
			created: Date.now(),
			livemode: false,
			pending_webhooks: 0,
			request: null
		}) as Stripe.Event

	describe('processEvent routing', () => {
		it('routes checkout.session.completed to checkoutHandler', async () => {
			const event = createEvent('checkout.session.completed', { id: 'cs_test' })

			await processor.processEvent(event)

			expect(mockCheckoutHandler.handleCheckoutCompleted).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'cs_test' })
			)
		})

		it('routes customer.subscription.created to subscriptionHandler', async () => {
			const event = createEvent('customer.subscription.created', {
				id: 'sub_test'
			})

			await processor.processEvent(event)

			expect(
				mockSubscriptionHandler.handleSubscriptionCreated
			).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub_test' }))
		})

		it('routes customer.subscription.updated to subscriptionHandler', async () => {
			const event = createEvent('customer.subscription.updated', {
				id: 'sub_test'
			})

			await processor.processEvent(event)

			expect(
				mockSubscriptionHandler.handleSubscriptionUpdated
			).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub_test' }))
		})

		it('routes customer.subscription.deleted to subscriptionHandler', async () => {
			const event = createEvent('customer.subscription.deleted', {
				id: 'sub_test'
			})

			await processor.processEvent(event)

			expect(
				mockSubscriptionHandler.handleSubscriptionDeleted
			).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub_test' }))
		})

		it('routes payment_intent.succeeded to paymentHandler', async () => {
			const event = createEvent('payment_intent.succeeded', { id: 'pi_test' })

			await processor.processEvent(event)

			expect(
				mockPaymentHandler.handlePaymentIntentSucceeded
			).toHaveBeenCalledWith(expect.objectContaining({ id: 'pi_test' }))
		})

		it('routes payment_intent.payment_failed to paymentHandler', async () => {
			const event = createEvent('payment_intent.payment_failed', {
				id: 'pi_test'
			})

			await processor.processEvent(event)

			expect(mockPaymentHandler.handlePaymentIntentFailed).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'pi_test' })
			)
		})

		it('routes invoice.payment_failed to paymentHandler', async () => {
			const event = createEvent('invoice.payment_failed', { id: 'in_test' })

			await processor.processEvent(event)

			expect(mockPaymentHandler.handlePaymentFailed).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'in_test' })
			)
		})

		it('routes payment_method.attached to paymentHandler', async () => {
			const event = createEvent('payment_method.attached', { id: 'pm_test' })

			await processor.processEvent(event)

			expect(mockPaymentHandler.handlePaymentAttached).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'pm_test' })
			)
		})

		it('routes account.updated to connectHandler', async () => {
			const event = createEvent('account.updated', { id: 'acct_test' })

			await processor.processEvent(event)

			expect(mockConnectHandler.handleAccountUpdated).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'acct_test' })
			)
		})

		it('handles unknown event types gracefully', async () => {
			const event = createEvent('unknown.event.type', { id: 'unknown' })

			// Should not throw
			await expect(processor.processEvent(event)).resolves.toBeUndefined()
		})
	})
})
