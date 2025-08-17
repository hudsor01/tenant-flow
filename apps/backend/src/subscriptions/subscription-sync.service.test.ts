import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SubscriptionSyncService } from './subscription-sync.service'
import { SupabaseService } from '../supabase/supabase.service'
import { StripeService } from '../stripe/stripe.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { StructuredLoggerService } from '../common/logging/structured-logger.service'
import type { StripeSubscription } from '@repo/shared/types/stripe'
import type { Subscription, User } from '@repo/shared'

// Mock Stripe types
const mockStripeSubscription: StripeSubscription = {
	id: 'sub_test123',
	object: 'subscription',
	application: null,
	application_fee_percent: null,
	automatic_tax: { enabled: false },
	billing_cycle_anchor: 1234567890,
	billing_thresholds: null,
	cancel_at: null,
	cancel_at_period_end: false,
	canceled_at: null,
	cancellation_details: { comment: null, feedback: null, reason: null },
	collection_method: 'charge_automatically',
	created: 1234567890,
	currency: 'usd',
	current_period_end: 1234567890 + 86400 * 30,
	current_period_start: 1234567890,
	customer: 'cus_test123',
	days_until_due: null,
	default_payment_method: null,
	default_source: null,
	default_tax_rates: [],
	description: null,
	discount: null,
	ended_at: null,
	items: {
		object: 'list',
		data: [
			{
				id: 'si_test123',
				object: 'subscription_item',
				billing_thresholds: null,
				created: 1234567890,
				metadata: {},
				price: {
					id: 'price_starter_monthly',
					object: 'price',
					active: true,
					billing_scheme: 'per_unit',
					created: 1234567890,
					currency: 'usd',
					custom_unit_amount: null,
					livemode: false,
					lookup_key: null,
					metadata: {},
					nickname: null,
					product: 'prod_starter',
					recurring: {
						aggregate_usage: null,
						interval: 'month',
						interval_count: 1,
						trial_period_days: null,
						usage_type: 'licensed'
					},
					tax_behavior: 'unspecified',
					tiers_mode: null,
					transform_quantity: null,
					type: 'recurring',
					unit_amount: 2900,
					unit_amount_decimal: '2900'
				},
				quantity: 1,
				subscription: 'sub_test123',
				tax_rates: []
			}
		],
		has_more: false,
		total_count: 1,
		url: '/v1/subscription_items?subscription=sub_test123'
	},
	latest_invoice: null,
	livemode: false,
	metadata: {},
	next_pending_invoice_item_invoice: null,
	on_behalf_of: null,
	pause_collection: null,
	payment_settings: {
		payment_method_options: null,
		payment_method_types: null,
		save_default_payment_method: 'off'
	},
	pending_invoice_item_interval: null,
	pending_setup_intent: null,
	pending_update: null,
	schedule: null,
	start_date: 1234567890,
	status: 'active',
	test_clock: null,
	transfer_data: null,
	trial_end: null,
	trial_settings: {
		end_behavior: { missing_payment_method: 'create_invoice' }
	},
	trial_start: null
}

const mockUser: User = {
	id: 'user_test123',
	email: 'test@example.com',
	name: 'Test User',
	stripeCustomerId: 'cus_test123',
	role: 'USER',
	createdAt: new Date(),
	updatedAt: new Date()
}

const mockSubscription: Subscription = {
	id: 'subscription_test123',
	userId: 'user_test123',
	planType: 'STARTER',
	status: 'ACTIVE',
	stripeSubscriptionId: 'sub_test123',
	stripeCustomerId: 'cus_test123',
	currentPeriodStart: new Date(1234567890 * 1000),
	currentPeriodEnd: new Date((1234567890 + 86400 * 30) * 1000),
	cancelAtPeriodEnd: false,
	trialStart: null,
	trialEnd: null,
	canceledAt: null,
	createdAt: new Date(),
	updatedAt: new Date()
}

describe('SubscriptionSyncService', () => {
	let service: SubscriptionSyncService
	let prismaService: jest.Mocked<PrismaService>
	let stripeService: jest.Mocked<StripeService>
	let subscriptionManager: jest.Mocked<SubscriptionsManagerService>
	let eventEmitter: jest.Mocked<EventEmitter2>
	let errorHandler: jest.Mocked<ErrorHandlerService>

	beforeEach(async () => {
		const mockPrismaService = {
			subscription: {
				findUnique: jest.fn(),
				upsert: jest.fn(),
				update: jest.fn()
			},
			user: {
				findFirst: jest.fn(),
				findMany: jest.fn()
			}
		}

		const mockStripeService = {
			client: {
				subscriptions: {
					retrieve: jest.fn()
				}
			}
		}

		const mockSubscriptionManager = {
			getSubscription: jest.fn()
		}

		const mockEventEmitter = {
			emit: jest.fn()
		}

		const mockErrorHandler = {
			handleErrorEnhanced: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SubscriptionSyncService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: StripeService, useValue: mockStripeService },
				{
					provide: SubscriptionsManagerService,
					useValue: mockSubscriptionManager
				},
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: ErrorHandlerService, useValue: mockErrorHandler }
			]
		}).compile()

		service = module.get<SubscriptionSyncService>(SubscriptionSyncService)
		prismaService = module.get(PrismaService)
		stripeService = module.get(StripeService)
		subscriptionManager = module.get(SubscriptionsManagerService)
		eventEmitter = module.get(EventEmitter2)
		errorHandler = module.get(ErrorHandlerService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('syncSubscriptionFromWebhook', () => {
		it('should successfully sync a new subscription from webhook', async () => {
			// Arrange
			prismaService.user.findFirst.mockResolvedValue(mockUser)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)
			subscriptionManager.getSubscription.mockResolvedValue(null)

			// Act
			const result = await service.syncSubscriptionFromWebhook(
				mockStripeSubscription
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.subscription).toEqual(mockSubscription)
			expect(result.changes).toContain('created')
			expect(prismaService.subscription.upsert).toHaveBeenCalledWith({
				where: { userId: mockUser.id },
				update: expect.objectContaining({
					planType: 'STARTER',
					status: 'active',
					stripeSubscriptionId: mockStripeSubscription.id
				}),
				create: expect.objectContaining({
					userId: mockUser.id,
					planType: 'STARTER',
					status: 'active',
					stripeSubscriptionId: mockStripeSubscription.id
				})
			})
			expect(eventEmitter.emit).toHaveBeenCalled()
		})

		it('should successfully sync an updated subscription from webhook', async () => {
			// Arrange
			const existingSubscription = {
				...mockSubscription,
				planType: 'FREETRIAL'
			}
			prismaService.user.findFirst.mockResolvedValue(mockUser)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)
			subscriptionManager.getSubscription.mockResolvedValue(
				existingSubscription as any
			)

			// Act
			const result = await service.syncSubscriptionFromWebhook(
				mockStripeSubscription
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.changes).toContain('plan: FREETRIAL → STARTER')
			expect(eventEmitter.emit).toHaveBeenCalled()
		})

		it('should handle user not found error', async () => {
			// Arrange
			prismaService.user.findFirst.mockResolvedValue(null)

			// Act
			const result = await service.syncSubscriptionFromWebhook(
				mockStripeSubscription
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toContain('User not found for customer')
		})

		it('should handle database errors gracefully', async () => {
			// Arrange
			const dbError = new Error('Database connection failed')
			prismaService.user.findFirst.mockRejectedValue(dbError)

			// Act
			const result = await service.syncSubscriptionFromWebhook(
				mockStripeSubscription
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('Database connection failed')
		})
	})

	describe('syncUserSubscription', () => {
		it('should sync user subscription successfully', async () => {
			// Arrange
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			// Act
			const result = await service.syncUserSubscription('user_test123')

			// Assert
			expect(result.success).toBe(true)
			expect(result.subscription).toEqual(mockSubscription)
			expect(
				stripeService.client.subscriptions.retrieve
			).toHaveBeenCalledWith('sub_test123')
		})

		it('should return success when no Stripe subscription exists', async () => {
			// Arrange
			const subscriptionWithoutStripe = {
				...mockSubscription,
				stripeSubscriptionId: null
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				subscriptionWithoutStripe as any
			)

			// Act
			const result = await service.syncUserSubscription('user_test123')

			// Assert
			expect(result.success).toBe(true)
			expect(result.subscription).toEqual(subscriptionWithoutStripe)
			expect(result.changes).toEqual([])
			expect(
				stripeService.client.subscriptions.retrieve
			).not.toHaveBeenCalled()
		})

		it('should use cache for recent sync results', async () => {
			// Arrange
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			// Act - First call
			const result1 = await service.syncUserSubscription('user_test123')

			// Act - Second call (should use cache)
			const result2 = await service.syncUserSubscription('user_test123')

			// Assert
			expect(result1.success).toBe(true)
			expect(result2.success).toBe(true)
			expect(
				stripeService.client.subscriptions.retrieve
			).toHaveBeenCalledTimes(1) // Only called once due to cache
		})

		it('should bypass cache when force=true', async () => {
			// Arrange
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			// Act - First call
			await service.syncUserSubscription('user_test123')

			// Act - Second call with force=true
			await service.syncUserSubscription('user_test123', true)

			// Assert
			expect(
				stripeService.client.subscriptions.retrieve
			).toHaveBeenCalledTimes(2) // Called twice due to force
		})
	})

	describe('getSubscriptionState', () => {
		it('should return comprehensive subscription state', async () => {
			// Arrange
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)

			// Act
			const state = await service.getSubscriptionState('user_test123')

			// Assert
			expect(state.subscription).toEqual(mockSubscription)
			expect(state.stripeSubscription).toEqual(mockStripeSubscription)
			expect(state.isSync).toBe(true)
			expect(state.discrepancies).toBeUndefined()
		})

		it('should detect discrepancies between database and Stripe', async () => {
			// Arrange
			const outdatedSubscription = {
				...mockSubscription,
				status: 'INCOMPLETE'
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				outdatedSubscription as any
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)

			// Act
			const state = await service.getSubscriptionState('user_test123')

			// Assert
			expect(state.isSync).toBe(false)
			expect(state.discrepancies).toContain(
				'Status mismatch: DB=INCOMPLETE, Stripe=active'
			)
		})

		it('should handle missing Stripe subscription', async () => {
			// Arrange
			const subscriptionWithoutStripe = {
				...mockSubscription,
				stripeSubscriptionId: null
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				subscriptionWithoutStripe as any
			)

			// Act
			const state = await service.getSubscriptionState('user_test123')

			// Assert
			expect(state.subscription).toEqual(subscriptionWithoutStripe)
			expect(state.stripeSubscription).toBeNull()
			expect(state.isSync).toBe(true)
		})

		it('should handle Stripe API errors gracefully', async () => {
			// Arrange
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockRejectedValue(
				new Error('Stripe API error')
			)

			// Act
			const state = await service.getSubscriptionState('user_test123')

			// Assert
			expect(state.subscription).toEqual(mockSubscription)
			expect(state.stripeSubscription).toBeNull()
			expect(state.isSync).toBe(false)
			expect(state.discrepancies).toContain(
				'Unable to fetch Stripe subscription: Error: Stripe API error'
			)
		})
	})

	describe('bulkSyncSubscriptions', () => {
		it('should successfully sync multiple users', async () => {
			// Arrange
			const userIds = ['user1', 'user2', 'user3']
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			const onProgress = jest.fn()

			// Act
			const results = await service.bulkSyncSubscriptions(userIds, {
				batchSize: 2,
				delayMs: 10,
				onProgress
			})

			// Assert
			expect(results.completed).toBe(3)
			expect(results.errors).toBe(0)
			expect(results.results).toHaveLength(3)
			expect(onProgress).toHaveBeenCalled()
		})

		it('should handle errors during bulk sync', async () => {
			// Arrange
			const userIds = ['user1', 'user2']
			subscriptionManager.getSubscription
				.mockResolvedValueOnce(mockSubscription)
				.mockRejectedValueOnce(new Error('Database error'))

			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			// Act
			const results = await service.bulkSyncSubscriptions(userIds)

			// Assert
			expect(results.completed).toBe(2)
			expect(results.errors).toBe(1)
			expect(results.results[0].result.success).toBe(true)
			expect(results.results[1].result.success).toBe(false)
			expect(results.results[1].result.error).toBe('Database error')
		})

		it('should respect batch size and delays', async () => {
			// Arrange
			const userIds = ['user1', 'user2', 'user3', 'user4']
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)

			const startTime = Date.now()

			// Act
			await service.bulkSyncSubscriptions(userIds, {
				batchSize: 2,
				delayMs: 50
			})

			// Assert
			const endTime = Date.now()
			const executionTime = endTime - startTime
			expect(executionTime).toBeGreaterThan(50) // Should have at least one delay
		})
	})

	describe('event emission', () => {
		it('should emit subscription created event for new subscriptions', async () => {
			// Arrange
			prismaService.user.findFirst.mockResolvedValue(mockUser)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)
			subscriptionManager.getSubscription.mockResolvedValue(null)

			// Act
			await service.syncSubscriptionFromWebhook(mockStripeSubscription)

			// Assert
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.created',
				expect.objectContaining({
					userId: mockUser.id,
					subscriptionId: mockStripeSubscription.id,
					planType: 'STARTER'
				})
			)
		})

		it('should emit subscription updated event for plan changes', async () => {
			// Arrange
			const existingSubscription = {
				...mockSubscription,
				planType: 'FREETRIAL'
			}
			prismaService.user.findFirst.mockResolvedValue(mockUser)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)
			subscriptionManager.getSubscription.mockResolvedValue(
				existingSubscription as any
			)

			// Act
			await service.syncSubscriptionFromWebhook(mockStripeSubscription)

			// Assert
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.updated',
				expect.objectContaining({
					userId: mockUser.id,
					oldPlanType: 'FREETRIAL',
					newPlanType: 'STARTER'
				})
			)
		})

		it('should emit trial will end event for trialing subscriptions', async () => {
			// Arrange
			const trialSubscription: StripeSubscription = {
				...mockStripeSubscription,
				status: 'trialing',
				trial_end: Math.floor(
					(Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000
				) // 2 days from now
			}

			prismaService.user.findFirst.mockResolvedValue(mockUser)
			prismaService.subscription.upsert.mockResolvedValue(
				mockSubscription
			)
			subscriptionManager.getSubscription.mockResolvedValue(null)

			// Act
			await service.syncSubscriptionFromWebhook(trialSubscription)

			// Assert
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.trial_will_end',
				expect.objectContaining({
					userId: mockUser.id,
					daysRemaining: 2
				})
			)
		})
	})

	describe('error handling', () => {
		it('should handle and transform database errors', async () => {
			// Arrange
			const dbError = new Error('Database connection failed')
			prismaService.user.findFirst.mockResolvedValue(mockUser)
			subscriptionManager.getSubscription.mockResolvedValue(null)
			prismaService.subscription.upsert.mockRejectedValue(dbError)
			errorHandler.handleErrorEnhanced.mockImplementation(() => {
				throw dbError
			})

			// Act & Assert
			await expect(
				service.syncSubscriptionFromWebhook(mockStripeSubscription)
			).rejects.toThrow('Database connection failed')

			expect(errorHandler.handleErrorEnhanced).toHaveBeenCalledWith(
				dbError,
				expect.objectContaining({
					operation: 'SubscriptionSyncService.performSubscriptionSync'
				})
			)
		})

		it('should handle Stripe API errors during user sync', async () => {
			// Arrange
			const stripeError = new Error('Stripe API rate limit exceeded')
			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockRejectedValue(
				stripeError
			)

			// Act
			const result = await service.syncUserSubscription('user_test123')

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('Stripe API rate limit exceeded')
		})
	})

	describe('plan type mapping', () => {
		it('should correctly map Stripe price IDs to plan types', async () => {
			// Test different price IDs
			const testCases = [
				{ priceId: 'price_starter_monthly', expectedPlan: 'STARTER' },
				{ priceId: 'price_growth_annual', expectedPlan: 'GROWTH' },
				{
					priceId: 'price_max_monthly',
					expectedPlan: 'TENANTFLOW_MAX'
				},
				{ priceId: 'price_unknown', expectedPlan: 'FREETRIAL' }
			]

			for (const testCase of testCases) {
				// Arrange
				const testSubscription = {
					...mockStripeSubscription,
					items: {
						...mockStripeSubscription.items,
						data: [
							{
								...mockStripeSubscription.items.data[0],
								price: {
									...mockStripeSubscription.items.data[0]
										.price,
									id: testCase.priceId
								}
							}
						]
					}
				}

				prismaService.user.findFirst.mockResolvedValue(mockUser)
				subscriptionManager.getSubscription.mockResolvedValue(null)
				prismaService.subscription.upsert.mockResolvedValue({
					...mockSubscription,
					planType: testCase.expectedPlan as any
				})

				// Act
				const result =
					await service.syncSubscriptionFromWebhook(testSubscription)

				// Assert
				expect(result.success).toBe(true)
				expect(prismaService.subscription.upsert).toHaveBeenCalledWith(
					expect.objectContaining({
						create: expect.objectContaining({
							planType: testCase.expectedPlan
						}),
						update: expect.objectContaining({
							planType: testCase.expectedPlan
						})
					})
				)

				// Reset mocks for next iteration
				jest.clearAllMocks()
			}
		})
	})
})
