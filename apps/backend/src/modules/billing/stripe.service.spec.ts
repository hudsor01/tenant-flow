import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { StripeService } from './stripe.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { RedisCacheService } from '../../cache/cache.service'
import { StripeCustomerService } from './stripe-customer.service'
import { SubscriptionService } from './subscriptions/subscription.service'
import { PaymentMethodService } from './subscriptions/payment-method.service'

describe('StripeService', () => {
	let service: StripeService
	let mockStripe: jest.Mocked<Stripe>
	let mockCache: jest.Mocked<RedisCacheService>
	let mockSubscriptionService: jest.Mocked<SubscriptionService>
	let mockCustomerService: jest.Mocked<StripeCustomerService>
	let mockPaymentMethodService: jest.Mocked<PaymentMethodService>

	beforeEach(async () => {
		// Create mock Stripe with invoices API
		const mockInvoicesList = jest.fn()
		const mockAutoPagingToArray = jest.fn()

		mockStripe = {
			invoices: {
				list: mockInvoicesList
			}
		} as unknown as jest.Mocked<Stripe>

		// Setup list to return data with autoPagingToArray method
		mockInvoicesList.mockReturnValue({
			data: [],
			has_more: false,
			autoPagingToArray: mockAutoPagingToArray
		})

		const mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		mockCache = {
			get: jest.fn(),
			set: jest.fn()
		} as unknown as jest.Mocked<RedisCacheService>

		mockSubscriptionService = {
			listSubscriptions: jest.fn(),
			getAllSubscriptions: jest.fn(),
			searchSubscriptions: jest.fn(),
			createSubscription: jest.fn(),
			updateSubscription: jest.fn()
		} as unknown as jest.Mocked<SubscriptionService>

		mockCustomerService = {
			listCustomers: jest.fn(),
			getAllCustomers: jest.fn(),
			getCustomer: jest.fn(),
			createCustomer: jest.fn()
		} as unknown as jest.Mocked<StripeCustomerService>

		mockPaymentMethodService = {
			createPaymentIntent: jest.fn(),
			createCheckoutSession: jest.fn(),
			getCharge: jest.fn()
		} as unknown as jest.Mocked<PaymentMethodService>

		const module = await Test.createTestingModule({
			providers: [
				StripeService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: AppLogger, useValue: new SilentLogger() },
				{ provide: RedisCacheService, useValue: mockCache },
				{ provide: SubscriptionService, useValue: mockSubscriptionService },
				{ provide: StripeCustomerService, useValue: mockCustomerService },
				{ provide: PaymentMethodService, useValue: mockPaymentMethodService }
			]
		}).compile()

		service = module.get<StripeService>(StripeService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('listInvoices', () => {
		const mockInvoices: Stripe.Invoice[] = [
			{ id: 'in_1', customer: 'cus_1', status: 'paid' } as Stripe.Invoice,
			{ id: 'in_2', customer: 'cus_1', status: 'open' } as Stripe.Invoice
		]

		it('returns cached invoices when available', async () => {
			mockCache.get.mockResolvedValue(mockInvoices)

			const result = await service.listInvoices({ customer: 'cus_1' })

			expect(result).toEqual(mockInvoices)
			expect(mockStripe.invoices.list).not.toHaveBeenCalled()
		})

		it('fetches from Stripe when cache miss', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			const result = await service.listInvoices({ customer: 'cus_1' })

			expect(result).toEqual(mockInvoices)
			expect(mockStripe.invoices.list).toHaveBeenCalled()
		})

		it('caches results after fetch', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ customer: 'cus_1' })

			expect(mockCache.set).toHaveBeenCalledWith(
				expect.stringContaining('stripe:invoices:'),
				mockInvoices,
				expect.objectContaining({
					ttlMs: 45000, // 45 second TTL
					tier: 'short',
					tags: ['stripe']
				})
			)
		})

		it('passes customer filter to Stripe API', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ customer: 'cus_123' })

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_123'
				})
			)
		})

		it('passes subscription filter to Stripe API', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ subscription: 'sub_123' })

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					subscription: 'sub_123'
				})
			)
		})

		it('passes status filter to Stripe API', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ status: 'paid' })

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'paid'
				})
			)
		})

		it('passes created date filter to Stripe API', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			const created = { gte: 1704067200, lte: 1706745600 }
			await service.listInvoices({ created })

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					created
				})
			)
		})

		it('uses default limit of 10', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices()

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 10
				})
			)
		})

		it('uses provided limit', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ limit: 25 })

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 25
				})
			)
		})

		it('expands subscription and customer in response', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices()

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					expand: ['data.subscription', 'data.customer']
				})
			)
		})

		it('generates different cache keys for different parameters', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockResolvedValue({
				data: mockInvoices,
				has_more: false
			})

			await service.listInvoices({ customer: 'cus_1' })
			const cacheKey1 = (mockCache.set as jest.Mock).mock.calls[0][0]

			await service.listInvoices({ customer: 'cus_2' })
			const cacheKey2 = (mockCache.set as jest.Mock).mock.calls[1][0]

			expect(cacheKey1).not.toBe(cacheKey2)
		})

		it('propagates Stripe API errors', async () => {
			mockCache.get.mockResolvedValue(null)
			;(mockStripe.invoices.list as jest.Mock).mockRejectedValue(
				new Error('Stripe API error')
			)

			await expect(service.listInvoices()).rejects.toThrow('Stripe API error')
		})
	})

	describe('getAllInvoices', () => {
		const mockInvoices: Stripe.Invoice[] = [
			{ id: 'in_1' } as Stripe.Invoice,
			{ id: 'in_2' } as Stripe.Invoice,
			{ id: 'in_3' } as Stripe.Invoice
		]

		it('uses SDK auto-pagination', async () => {
			const mockAutoPagingToArray = jest.fn().mockResolvedValue(mockInvoices)
			;(mockStripe.invoices.list as jest.Mock).mockReturnValue({
				autoPagingToArray: mockAutoPagingToArray
			})

			const result = await service.getAllInvoices()

			expect(result).toEqual(mockInvoices)
			expect(mockAutoPagingToArray).toHaveBeenCalledWith({ limit: 10000 })
		})

		it('passes filters to auto-pagination', async () => {
			const mockAutoPagingToArray = jest.fn().mockResolvedValue(mockInvoices)
			;(mockStripe.invoices.list as jest.Mock).mockReturnValue({
				autoPagingToArray: mockAutoPagingToArray
			})

			await service.getAllInvoices({
				customer: 'cus_123',
				status: 'paid'
			})

			expect(mockStripe.invoices.list).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_123',
					status: 'paid',
					limit: 100 // Default Stripe limit for pagination
				})
			)
		})

		it('propagates errors from auto-pagination', async () => {
			const mockAutoPagingToArray = jest
				.fn()
				.mockRejectedValue(new Error('Pagination error'))
			;(mockStripe.invoices.list as jest.Mock).mockReturnValue({
				autoPagingToArray: mockAutoPagingToArray
			})

			await expect(service.getAllInvoices()).rejects.toThrow('Pagination error')
		})
	})

	describe('delegation methods', () => {
		it('listSubscriptions delegates to SubscriptionService', async () => {
			const mockSubs = [{ id: 'sub_1' }] as Stripe.Subscription[]
			mockSubscriptionService.listSubscriptions.mockResolvedValue(mockSubs)

			const result = await service.listSubscriptions({ customer: 'cus_1' })

			expect(result).toEqual(mockSubs)
			expect(mockSubscriptionService.listSubscriptions).toHaveBeenCalledWith({
				customer: 'cus_1'
			})
		})

		it('getAllSubscriptions delegates to SubscriptionService', async () => {
			const mockSubs = [{ id: 'sub_1' }] as Stripe.Subscription[]
			mockSubscriptionService.getAllSubscriptions.mockResolvedValue(mockSubs)

			const result = await service.getAllSubscriptions({ status: 'active' })

			expect(result).toEqual(mockSubs)
			expect(mockSubscriptionService.getAllSubscriptions).toHaveBeenCalledWith({
				status: 'active'
			})
		})

		it('listCustomers delegates to StripeCustomerService', async () => {
			const mockCustomers = [{ id: 'cus_1' }] as Stripe.Customer[]
			mockCustomerService.listCustomers.mockResolvedValue(mockCustomers)

			const result = await service.listCustomers({ email: 'test@example.com' })

			expect(result).toEqual(mockCustomers)
			expect(mockCustomerService.listCustomers).toHaveBeenCalledWith({
				email: 'test@example.com'
			})
		})

		it('getAllCustomers delegates to StripeCustomerService', async () => {
			const mockCustomers = [{ id: 'cus_1' }] as Stripe.Customer[]
			mockCustomerService.getAllCustomers.mockResolvedValue(mockCustomers)

			const result = await service.getAllCustomers()

			expect(result).toEqual(mockCustomers)
			expect(mockCustomerService.getAllCustomers).toHaveBeenCalled()
		})

		it('getCustomer delegates to StripeCustomerService', async () => {
			const mockCustomer = { id: 'cus_1' } as Stripe.Customer
			mockCustomerService.getCustomer.mockResolvedValue(mockCustomer)

			const result = await service.getCustomer('cus_1')

			expect(result).toEqual(mockCustomer)
			expect(mockCustomerService.getCustomer).toHaveBeenCalledWith('cus_1')
		})

		it('searchSubscriptions delegates to SubscriptionService', async () => {
			const mockSubs = [{ id: 'sub_1' }] as Stripe.Subscription[]
			mockSubscriptionService.searchSubscriptions.mockResolvedValue(mockSubs)

			const result = await service.searchSubscriptions("status:'active'")

			expect(result).toEqual(mockSubs)
			expect(mockSubscriptionService.searchSubscriptions).toHaveBeenCalledWith(
				"status:'active'"
			)
		})

		it('createPaymentIntent delegates to PaymentMethodService', async () => {
			const mockPI = { id: 'pi_1' } as Stripe.PaymentIntent
			mockPaymentMethodService.createPaymentIntent.mockResolvedValue(mockPI)

			const params = { amount: 1000, currency: 'usd' }
			const result = await service.createPaymentIntent(params, 'idem_key')

			expect(result).toEqual(mockPI)
			expect(mockPaymentMethodService.createPaymentIntent).toHaveBeenCalledWith(
				params,
				'idem_key'
			)
		})

		it('createCustomer delegates to StripeCustomerService', async () => {
			const mockCustomer = { id: 'cus_1' } as Stripe.Customer
			mockCustomerService.createCustomer.mockResolvedValue(mockCustomer)

			const params = { email: 'test@example.com' }
			const result = await service.createCustomer(params, 'idem_key')

			expect(result).toEqual(mockCustomer)
			expect(mockCustomerService.createCustomer).toHaveBeenCalledWith(
				params,
				'idem_key'
			)
		})

		it('createSubscription delegates to SubscriptionService', async () => {
			const mockSub = { id: 'sub_1' } as Stripe.Subscription
			mockSubscriptionService.createSubscription.mockResolvedValue(mockSub)

			const params = {
				customer: 'cus_1',
				items: [{ price: 'price_1' }]
			}
			const result = await service.createSubscription(params, 'idem_key')

			expect(result).toEqual(mockSub)
			expect(mockSubscriptionService.createSubscription).toHaveBeenCalledWith(
				params,
				'idem_key'
			)
		})

		it('updateSubscription delegates to SubscriptionService', async () => {
			const mockSub = { id: 'sub_1' } as Stripe.Subscription
			mockSubscriptionService.updateSubscription.mockResolvedValue(mockSub)

			const params = { items: [{ price: 'price_2' }] }
			const result = await service.updateSubscription('sub_1', params, 'idem_key')

			expect(result).toEqual(mockSub)
			expect(mockSubscriptionService.updateSubscription).toHaveBeenCalledWith(
				'sub_1',
				params,
				'idem_key'
			)
		})

		it('createCheckoutSession delegates to PaymentMethodService', async () => {
			const mockSession = { id: 'cs_1' } as Stripe.Checkout.Session
			mockPaymentMethodService.createCheckoutSession.mockResolvedValue(
				mockSession
			)

			const params = {
				mode: 'subscription' as const,
				line_items: [{ price: 'price_1', quantity: 1 }],
				success_url: 'https://example.com/success',
				cancel_url: 'https://example.com/cancel'
			}
			const result = await service.createCheckoutSession(params, 'idem_key')

			expect(result).toEqual(mockSession)
			expect(mockPaymentMethodService.createCheckoutSession).toHaveBeenCalledWith(
				params,
				'idem_key'
			)
		})

		it('getCharge delegates to PaymentMethodService', async () => {
			const mockCharge = { id: 'ch_1' } as Stripe.Charge
			mockPaymentMethodService.getCharge.mockResolvedValue(mockCharge)

			const result = await service.getCharge('ch_1')

			expect(result).toEqual(mockCharge)
			expect(mockPaymentMethodService.getCharge).toHaveBeenCalledWith('ch_1')
		})
	})

	describe('getStripe', () => {
		it('returns the Stripe instance', () => {
			const stripe = service.getStripe()
			expect(stripe).toBe(mockStripe)
		})
	})
})
