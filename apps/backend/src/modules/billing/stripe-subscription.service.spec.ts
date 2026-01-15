/**
 * Stripe Subscription Service Tests
 *
 * Unit tests for StripeSubscriptionService covering:
 * - listSubscriptions: with caching, customer filter, status filter
 * - getAllSubscriptions: pagination, max items limit
 * - searchSubscriptions: Stripe search API
 * - createSubscription: with params, idempotency key
 * - updateSubscription: updates, error handling
 */

import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { StripeSubscriptionService } from './stripe-subscription.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { RedisCacheService } from '../../cache/cache.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

const createMockStripe = (): jest.Mocked<Stripe> => {
	return {
		subscriptions: {
			list: jest.fn(),
			search: jest.fn(),
			create: jest.fn(),
			update: jest.fn()
		}
	} as unknown as jest.Mocked<Stripe>
}

const createMockSubscription = (
	id: string,
	overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription =>
	({
		id,
		object: 'subscription' as const,
		status: 'active',
		customer: 'cus_test',
		items: { data: [] },
		...overrides
	}) as Stripe.Subscription

describe('StripeSubscriptionService', () => {
	let service: StripeSubscriptionService
	let mockStripe: jest.Mocked<Stripe>
	let mockStripeClientService: jest.Mocked<StripeClientService>
	let mockCacheService: jest.Mocked<RedisCacheService>

	beforeEach(async () => {
		mockStripe = createMockStripe()

		mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		mockCacheService = {
			get: jest.fn(),
			set: jest.fn()
		} as unknown as jest.Mocked<RedisCacheService>

		const module = await Test.createTestingModule({
			providers: [
				StripeSubscriptionService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: RedisCacheService, useValue: mockCacheService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<StripeSubscriptionService>(StripeSubscriptionService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('listSubscriptions', () => {
		it('should return subscriptions from Stripe API', async () => {
			const mockSubscriptions = [
				createMockSubscription('sub_1'),
				createMockSubscription('sub_2')
			]

			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: mockSubscriptions,
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			const result = await service.listSubscriptions()

			expect(result).toEqual(mockSubscriptions)
			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith({
				limit: 10,
				expand: ['data.customer', 'data.items']
			})
		})

		it('should return cached subscriptions if available', async () => {
			const cachedSubscriptions = [
				createMockSubscription('sub_cached_1'),
				createMockSubscription('sub_cached_2')
			]

			mockCacheService.get.mockResolvedValue(cachedSubscriptions)

			const result = await service.listSubscriptions()

			expect(result).toEqual(cachedSubscriptions)
			expect(mockStripe.subscriptions.list).not.toHaveBeenCalled()
		})

		it('should cache subscriptions after fetching from Stripe', async () => {
			const mockSubscriptions = [createMockSubscription('sub_1')]

			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: mockSubscriptions,
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.listSubscriptions()

			expect(mockCacheService.set).toHaveBeenCalledWith(
				expect.stringContaining('stripe:subscriptions:'),
				mockSubscriptions,
				expect.objectContaining({
					ttlMs: 90_000,
					tier: 'short',
					tags: ['stripe']
				})
			)
		})

		it('should filter by customer when provided', async () => {
			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.listSubscriptions({ customer: 'cus_123' })

			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_123'
				})
			)
		})

		it('should filter by status when provided', async () => {
			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.listSubscriptions({ status: 'active' })

			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'active'
				})
			)
		})

		it('should use custom limit when provided', async () => {
			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.listSubscriptions({ limit: 50 })

			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 50
				})
			)
		})

		it('should throw error on Stripe API failure', async () => {
			const stripeError = new Error('Stripe API error')

			mockCacheService.get.mockResolvedValue(null)
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockRejectedValue(stripeError)

			await expect(service.listSubscriptions()).rejects.toThrow(
				'Stripe API error'
			)
		})
	})

	describe('getAllSubscriptions', () => {
		it('should return all subscriptions with pagination', async () => {
			const page1 = [
				createMockSubscription('sub_1'),
				createMockSubscription('sub_2')
			]
			const page2 = [createMockSubscription('sub_3')]

			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			)
				.mockResolvedValueOnce({
					data: page1,
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Subscription>)
				.mockResolvedValueOnce({
					data: page2,
					has_more: false,
					object: 'list'
				} as Stripe.ApiList<Stripe.Subscription>)

			const result = await service.getAllSubscriptions()

			expect(result).toHaveLength(3)
			expect(result[0]?.id).toBe('sub_1')
			expect(result[2]?.id).toBe('sub_3')
			expect(mockStripe.subscriptions.list).toHaveBeenCalledTimes(2)
		})

		it('should use starting_after for pagination', async () => {
			const page1 = [createMockSubscription('sub_1')]

			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			)
				.mockResolvedValueOnce({
					data: page1,
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Subscription>)
				.mockResolvedValueOnce({
					data: [],
					has_more: false,
					object: 'list'
				} as Stripe.ApiList<Stripe.Subscription>)

			await service.getAllSubscriptions()

			expect(mockStripe.subscriptions.list).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					starting_after: 'sub_1'
				})
			)
		})

		it('should filter by customer when provided', async () => {
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.getAllSubscriptions({ customer: 'cus_filter' })

			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_filter'
				})
			)
		})

		it('should filter by status when provided', async () => {
			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Subscription>)

			await service.getAllSubscriptions({ status: 'canceled' })

			expect(mockStripe.subscriptions.list).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'canceled'
				})
			)
		})

		it('should stop at max items limit', async () => {
			// Create 100 subscriptions per page to simulate hitting the limit
			const createPage = (startId: number): Stripe.Subscription[] =>
				Array.from({ length: 100 }, (_, i) =>
					createMockSubscription(`sub_${startId + i}`)
				)

			// Mock 11 pages (1100 items) but should stop at 1000
			for (let i = 0; i < 11; i++) {
				;(
					mockStripe.subscriptions.list as jest.MockedFunction<
						Stripe['subscriptions']['list']
					>
				).mockResolvedValueOnce({
					data: createPage(i * 100),
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Subscription>)
			}

			const result = await service.getAllSubscriptions()

			// Should stop at 1000 items (10 pages of 100)
			expect(result.length).toBe(1000)
			expect(mockStripe.subscriptions.list).toHaveBeenCalledTimes(10)
		})

		it('should throw error on Stripe API failure', async () => {
			const stripeError = new Error('Stripe pagination error')

			;(
				mockStripe.subscriptions.list as jest.MockedFunction<
					Stripe['subscriptions']['list']
				>
			).mockRejectedValue(stripeError)

			await expect(service.getAllSubscriptions()).rejects.toThrow(
				'Stripe pagination error'
			)
		})
	})

	describe('searchSubscriptions', () => {
		it('should search subscriptions with query', async () => {
			const mockSubscriptions = [createMockSubscription('sub_search_1')]

			;(
				mockStripe.subscriptions.search as jest.MockedFunction<
					Stripe['subscriptions']['search']
				>
			).mockResolvedValue({
				data: mockSubscriptions,
				has_more: false,
				object: 'search_result',
				next_page: null,
				total_count: 1,
				url: '/v1/subscriptions/search'
			} as Stripe.ApiSearchResult<Stripe.Subscription>)

			const result = await service.searchSubscriptions(
				'status:"active" AND metadata["tenant_id"]:"tenant_123"'
			)

			expect(result).toEqual(mockSubscriptions)
			expect(mockStripe.subscriptions.search).toHaveBeenCalledWith({
				query: 'status:"active" AND metadata["tenant_id"]:"tenant_123"',
				limit: 100,
				expand: ['data.customer']
			})
		})

		it('should throw error on search failure', async () => {
			const searchError = new Error('Search failed')

			;(
				mockStripe.subscriptions.search as jest.MockedFunction<
					Stripe['subscriptions']['search']
				>
			).mockRejectedValue(searchError)

			await expect(service.searchSubscriptions('invalid query')).rejects.toThrow(
				'Search failed'
			)
		})
	})

	describe('createSubscription', () => {
		it('should create subscription with provided params', async () => {
			const mockSubscription = createMockSubscription('sub_new', {
				status: 'active'
			})

			;(
				mockStripe.subscriptions.create as jest.MockedFunction<
					Stripe['subscriptions']['create']
				>
			).mockResolvedValue(mockSubscription)

			const params: Stripe.SubscriptionCreateParams = {
				customer: 'cus_123',
				items: [{ price: 'price_123' }]
			}

			const result = await service.createSubscription(params)

			expect(result).toEqual(mockSubscription)
			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
				params,
				undefined
			)
		})

		it('should use idempotency key when provided', async () => {
			const mockSubscription = createMockSubscription('sub_idempotent')

			;(
				mockStripe.subscriptions.create as jest.MockedFunction<
					Stripe['subscriptions']['create']
				>
			).mockResolvedValue(mockSubscription)

			const params: Stripe.SubscriptionCreateParams = {
				customer: 'cus_123',
				items: [{ price: 'price_123' }]
			}

			await service.createSubscription(params, 'idem_key_123')

			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(params, {
				idempotencyKey: 'idem_key_123'
			})
		})

		it('should throw error on creation failure', async () => {
			const createError = new Error('Customer not found')

			;(
				mockStripe.subscriptions.create as jest.MockedFunction<
					Stripe['subscriptions']['create']
				>
			).mockRejectedValue(createError)

			const params: Stripe.SubscriptionCreateParams = {
				customer: 'cus_invalid',
				items: [{ price: 'price_123' }]
			}

			await expect(service.createSubscription(params)).rejects.toThrow(
				'Customer not found'
			)
		})
	})

	describe('updateSubscription', () => {
		it('should update subscription with provided params', async () => {
			const mockSubscription = createMockSubscription('sub_updated', {
				status: 'active'
			})

			;(
				mockStripe.subscriptions.update as jest.MockedFunction<
					Stripe['subscriptions']['update']
				>
			).mockResolvedValue(mockSubscription)

			const params: Stripe.SubscriptionUpdateParams = {
				metadata: { updated: 'true' }
			}

			const result = await service.updateSubscription('sub_123', params)

			expect(result).toEqual(mockSubscription)
			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				'sub_123',
				params,
				undefined
			)
		})

		it('should use idempotency key when provided', async () => {
			const mockSubscription = createMockSubscription('sub_updated')

			;(
				mockStripe.subscriptions.update as jest.MockedFunction<
					Stripe['subscriptions']['update']
				>
			).mockResolvedValue(mockSubscription)

			const params: Stripe.SubscriptionUpdateParams = {
				cancel_at_period_end: true
			}

			await service.updateSubscription('sub_123', params, 'update_idem_key')

			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				'sub_123',
				params,
				{ idempotencyKey: 'update_idem_key' }
			)
		})

		it('should throw error on update failure', async () => {
			const updateError = new Error('Subscription not found')

			;(
				mockStripe.subscriptions.update as jest.MockedFunction<
					Stripe['subscriptions']['update']
				>
			).mockRejectedValue(updateError)

			const params: Stripe.SubscriptionUpdateParams = {
				metadata: { test: 'value' }
			}

			await expect(
				service.updateSubscription('sub_invalid', params)
			).rejects.toThrow('Subscription not found')
		})

		it('should handle proration updates', async () => {
			const mockSubscription = createMockSubscription('sub_prorated')

			;(
				mockStripe.subscriptions.update as jest.MockedFunction<
					Stripe['subscriptions']['update']
				>
			).mockResolvedValue(mockSubscription)

			const params: Stripe.SubscriptionUpdateParams = {
				items: [{ id: 'si_123', price: 'price_new' }],
				proration_behavior: 'create_prorations'
			}

			await service.updateSubscription('sub_123', params)

			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				'sub_123',
				expect.objectContaining({
					proration_behavior: 'create_prorations'
				}),
				undefined
			)
		})
	})
})
