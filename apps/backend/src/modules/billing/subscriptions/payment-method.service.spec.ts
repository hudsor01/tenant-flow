import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { PaymentMethodService } from './payment-method.service'
import { StripeClientService } from '../../../shared/stripe-client.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('PaymentMethodService', () => {
	let service: PaymentMethodService
	let mockStripe: {
		paymentIntents: { create: jest.Mock }
		checkout: { sessions: { create: jest.Mock } }
		charges: { retrieve: jest.Mock }
		paymentMethods: { list: jest.Mock; detach: jest.Mock }
	}
	let mockStripeClientService: { getClient: jest.Mock }

	beforeEach(async () => {
		mockStripe = {
			paymentIntents: {
				create: jest.fn()
			},
			checkout: {
				sessions: {
					create: jest.fn()
				}
			},
			charges: {
				retrieve: jest.fn()
			},
			paymentMethods: {
				list: jest.fn(),
				detach: jest.fn()
			}
		}

		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		}

		const module = await Test.createTestingModule({
			providers: [
				PaymentMethodService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<PaymentMethodService>(PaymentMethodService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('createPaymentIntent', () => {
		const mockPaymentIntent = {
			id: 'pi_test123',
			amount: 10000,
			currency: 'usd',
			status: 'requires_payment_method'
		} as Stripe.PaymentIntent

		const params: Stripe.PaymentIntentCreateParams = {
			amount: 10000,
			currency: 'usd',
			customer: 'cus_test'
		}

		it('creates payment intent with params', async () => {
			mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

			const result = await service.createPaymentIntent(params)

			expect(result).toEqual(mockPaymentIntent)
			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				params,
				undefined
			)
		})

		it('uses idempotency key when provided', async () => {
			mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent)

			await service.createPaymentIntent(params, 'idempotency-key-123')

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(params, {
				idempotencyKey: 'idempotency-key-123'
			})
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Stripe API error')
			mockStripe.paymentIntents.create.mockRejectedValue(stripeError)

			await expect(service.createPaymentIntent(params)).rejects.toThrow(
				'Stripe API error'
			)
		})
	})

	describe('createCheckoutSession', () => {
		const mockSession = {
			id: 'cs_test123',
			url: 'https://checkout.stripe.com/test',
			status: 'open'
		} as Stripe.Checkout.Session

		const params: Stripe.Checkout.SessionCreateParams = {
			line_items: [{ price: 'price_test', quantity: 1 }],
			mode: 'payment',
			success_url: 'https://example.com/success',
			cancel_url: 'https://example.com/cancel'
		}

		it('creates checkout session with params', async () => {
			mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

			const result = await service.createCheckoutSession(params)

			expect(result).toEqual(mockSession)
			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				params,
				undefined
			)
		})

		it('uses idempotency key when provided', async () => {
			mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

			await service.createCheckoutSession(params, 'checkout-idempotency-key')

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(params, {
				idempotencyKey: 'checkout-idempotency-key'
			})
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Checkout session failed')
			mockStripe.checkout.sessions.create.mockRejectedValue(stripeError)

			await expect(service.createCheckoutSession(params)).rejects.toThrow(
				'Checkout session failed'
			)
		})
	})

	describe('getCharge', () => {
		const mockCharge = {
			id: 'ch_test123',
			amount: 10000,
			status: 'succeeded',
			failure_message: null
		} as Stripe.Charge

		it('returns charge by ID', async () => {
			mockStripe.charges.retrieve.mockResolvedValue(mockCharge)

			const result = await service.getCharge('ch_test123')

			expect(result).toEqual(mockCharge)
			expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_test123')
		})

		it('returns null on error', async () => {
			mockStripe.charges.retrieve.mockRejectedValue(new Error('Not found'))

			const result = await service.getCharge('ch_nonexistent')

			expect(result).toBeNull()
		})
	})

	describe('listPaymentMethods', () => {
		const mockPaymentMethods = [
			{ id: 'pm_1', type: 'card', card: { brand: 'visa', last4: '4242' } },
			{ id: 'pm_2', type: 'card', card: { brand: 'mastercard', last4: '5555' } }
		] as Stripe.PaymentMethod[]

		it('lists payment methods for customer', async () => {
			mockStripe.paymentMethods.list.mockResolvedValue({
				data: mockPaymentMethods
			})

			const result = await service.listPaymentMethods('cus_test123')

			expect(result).toEqual(mockPaymentMethods)
			expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
				customer: 'cus_test123',
				limit: 10
			})
		})

		it('filters by type when provided', async () => {
			mockStripe.paymentMethods.list.mockResolvedValue({
				data: mockPaymentMethods
			})

			await service.listPaymentMethods('cus_test123', 'card')

			expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
				customer: 'cus_test123',
				limit: 10,
				type: 'card'
			})
		})

		it('filters by us_bank_account type', async () => {
			mockStripe.paymentMethods.list.mockResolvedValue({
				data: []
			})

			await service.listPaymentMethods('cus_test123', 'us_bank_account')

			expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
				customer: 'cus_test123',
				limit: 10,
				type: 'us_bank_account'
			})
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Invalid customer')
			mockStripe.paymentMethods.list.mockRejectedValue(stripeError)

			await expect(
				service.listPaymentMethods('cus_invalid')
			).rejects.toThrow('Invalid customer')
		})
	})

	describe('detachPaymentMethod', () => {
		it('detaches payment method', async () => {
			mockStripe.paymentMethods.detach.mockResolvedValue({
				id: 'pm_test123',
				customer: null
			})

			await service.detachPaymentMethod('pm_test123')

			expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_test123')
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Payment method not found')
			mockStripe.paymentMethods.detach.mockRejectedValue(stripeError)

			await expect(
				service.detachPaymentMethod('pm_nonexistent')
			).rejects.toThrow('Payment method not found')
		})
	})
})
