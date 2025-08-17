import { Test, TestingModule } from '@nestjs/testing'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SubscriptionManagementService } from './subscription-management.service'
import { SupabaseService } from '../supabase/supabase.service'
import { StripeService } from '../stripe/stripe.service'
import { SubscriptionsManagerService } from './subscriptions-manager.service'
import { SubscriptionSyncService } from './subscription-sync.service'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
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
					id: 'price_growth_monthly',
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
					product: 'prod_growth',
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
					unit_amount: 7900,
					unit_amount_decimal: '7900'
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

describe('SubscriptionManagementService', () => {
	let service: SubscriptionManagementService
	let prismaService: jest.Mocked<PrismaService>
	let stripeService: jest.Mocked<StripeService>
	let subscriptionManager: jest.Mocked<SubscriptionsManagerService>
	let subscriptionSync: jest.Mocked<SubscriptionSyncService>
	let eventEmitter: jest.Mocked<EventEmitter2>
	let errorHandler: jest.Mocked<ErrorHandlerService>

	beforeEach(async () => {
		const mockPrismaService = {
			user: {
				findUnique: jest.fn()
			}
		}

		const mockStripeService = {
			client: {
				subscriptions: {
					retrieve: jest.fn(),
					update: jest.fn(),
					cancel: jest.fn()
				},
				subscriptionSchedules: {
					create: jest.fn()
				},
				checkout: {
					sessions: {
						create: jest.fn()
					}
				}
			}
		}

		const mockSubscriptionManager = {
			getSubscription: jest.fn(),
			calculateUsageMetrics: jest.fn(),
			getUsageLimitsForPlan: jest.fn()
		}

		const mockSubscriptionSync = {
			syncSubscriptionFromWebhook: jest.fn()
		}

		const mockEventEmitter = {
			emit: jest.fn()
		}

		const mockErrorHandler = {
			handleErrorEnhanced: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SubscriptionManagementService,
				{ provide: PrismaService, useValue: mockPrismaService },
				{ provide: StripeService, useValue: mockStripeService },
				{
					provide: SubscriptionsManagerService,
					useValue: mockSubscriptionManager
				},
				{
					provide: SubscriptionSyncService,
					useValue: mockSubscriptionSync
				},
				{ provide: EventEmitter2, useValue: mockEventEmitter },
				{ provide: ErrorHandlerService, useValue: mockErrorHandler }
			]
		}).compile()

		service = module.get<SubscriptionManagementService>(
			SubscriptionManagementService
		)
		prismaService = module.get(PrismaService)
		stripeService = module.get(StripeService)
		subscriptionManager = module.get(SubscriptionsManagerService)
		subscriptionSync = module.get(SubscriptionSyncService)
		eventEmitter = module.get(EventEmitter2)
		errorHandler = module.get(ErrorHandlerService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('upgradeSubscription', () => {
		it('should successfully upgrade a subscription', async () => {
			// Arrange
			const upgradeRequest = {
				targetPlan: 'GROWTH' as const,
				billingCycle: 'monthly' as const,
				prorationBehavior: 'create_prorations' as const
			}

			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			stripeService.client.subscriptions.update.mockResolvedValue({
				...mockStripeSubscription,
				items: {
					...mockStripeSubscription.items,
					data: [
						{
							...mockStripeSubscription.items.data[0],
							price: {
								...mockStripeSubscription.items.data[0].price,
								id: 'price_growth_monthly'
							}
						}
					]
				}
			})

			const mockSyncResult = {
				success: true,
				subscription: { ...mockSubscription, planType: 'GROWTH' },
				changes: ['plan: STARTER → GROWTH'],
				correlationId: 'test-correlation'
			}
			subscriptionSync.syncSubscriptionFromWebhook.mockResolvedValue(
				mockSyncResult as any
			)

			// Act
			const result = await service.upgradeSubscription(
				'user_test123',
				upgradeRequest
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.subscription?.planType).toBe('GROWTH')
			expect(result.changes).toContain('Upgraded from STARTER to GROWTH')
			expect(
				stripeService.client.subscriptions.update
			).toHaveBeenCalledWith(
				'sub_test123',
				expect.objectContaining({
					items: expect.any(Array),
					proration_behavior: 'create_prorations'
				})
			)
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.upgraded',
				expect.objectContaining({
					userId: 'user_test123',
					fromPlan: 'STARTER',
					toPlan: 'GROWTH'
				})
			)
		})

		it('should reject invalid upgrade (downgrade attempt)', async () => {
			// Arrange
			const upgradeRequest = {
				targetPlan: 'FREETRIAL' as const,
				billingCycle: 'monthly' as const
			}

			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)

			// Act
			const result = await service.upgradeSubscription(
				'user_test123',
				upgradeRequest
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('Target plan is not an upgrade')
			expect(
				stripeService.client.subscriptions.update
			).not.toHaveBeenCalled()
		})

		it('should handle missing subscription', async () => {
			// Arrange
			const upgradeRequest = {
				targetPlan: 'GROWTH' as const,
				billingCycle: 'monthly' as const
			}

			subscriptionManager.getSubscription.mockResolvedValue(null)

			// Act
			const result = await service.upgradeSubscription(
				'user_test123',
				upgradeRequest
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('No active subscription found')
		})

		it('should handle Stripe API errors', async () => {
			// Arrange
			const upgradeRequest = {
				targetPlan: 'GROWTH' as const,
				billingCycle: 'monthly' as const
			}

			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			stripeService.client.subscriptions.update.mockRejectedValue(
				new Error('Stripe API error')
			)

			// Act
			const result = await service.upgradeSubscription(
				'user_test123',
				upgradeRequest
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('Stripe API error')
		})
	})

	describe('downgradeSubscription', () => {
		it('should successfully downgrade a subscription immediately', async () => {
			// Arrange
			const downgradeRequest = {
				targetPlan: 'FREETRIAL' as const,
				billingCycle: 'monthly' as const,
				effectiveDate: 'immediate' as const,
				reason: 'Cost reduction'
			}

			const growthSubscription = {
				...mockSubscription,
				planType: 'GROWTH'
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				growthSubscription as any
			)
			subscriptionManager.calculateUsageMetrics.mockResolvedValue({
				properties: 5,
				tenants: 10,
				maintenanceRequests: 15
			} as any)
			subscriptionManager.getUsageLimitsForPlan.mockResolvedValue({
				properties: 10,
				tenants: 50,
				maintenanceRequests: 100
			} as any)

			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			stripeService.client.subscriptions.update.mockResolvedValue(
				mockStripeSubscription
			)

			const mockSyncResult = {
				success: true,
				subscription: { ...mockSubscription, planType: 'FREETRIAL' },
				changes: ['plan: GROWTH → FREETRIAL'],
				correlationId: 'test-correlation'
			}
			subscriptionSync.syncSubscriptionFromWebhook.mockResolvedValue(
				mockSyncResult as any
			)

			// Act
			const result = await service.downgradeSubscription(
				'user_test123',
				downgradeRequest
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.changes).toContain(
				'Downgraded from GROWTH to FREETRIAL immediately'
			)
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.downgraded',
				expect.objectContaining({
					userId: 'user_test123',
					fromPlan: 'GROWTH',
					toPlan: 'FREETRIAL',
					effectiveDate: 'immediate',
					reason: 'Cost reduction'
				})
			)
		})

		it('should schedule downgrade for end of period', async () => {
			// Arrange
			const downgradeRequest = {
				targetPlan: 'STARTER' as const,
				billingCycle: 'monthly' as const,
				effectiveDate: 'end_of_period' as const
			}

			const growthSubscription = {
				...mockSubscription,
				planType: 'GROWTH'
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				growthSubscription as any
			)
			subscriptionManager.calculateUsageMetrics.mockResolvedValue({
				properties: 5,
				tenants: 10,
				maintenanceRequests: 15
			} as any)
			subscriptionManager.getUsageLimitsForPlan.mockResolvedValue({
				properties: 10,
				tenants: 50,
				maintenanceRequests: 100
			} as any)

			stripeService.client.subscriptions.retrieve.mockResolvedValue(
				mockStripeSubscription
			)
			stripeService.client.subscriptionSchedules.create.mockResolvedValue(
				{
					id: 'sub_sched_test123',
					subscription: 'sub_test123'
				} as any
			)

			const mockSyncResult = {
				success: true,
				subscription: growthSubscription,
				changes: [],
				correlationId: 'test-correlation'
			}
			subscriptionSync.syncSubscriptionFromWebhook.mockResolvedValue(
				mockSyncResult as any
			)

			// Act
			const result = await service.downgradeSubscription(
				'user_test123',
				downgradeRequest
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.changes).toContain(
				'Downgraded from GROWTH to STARTER at the end of the current billing period'
			)
			expect(
				stripeService.client.subscriptionSchedules.create
			).toHaveBeenCalledWith(
				expect.objectContaining({
					from_subscription: 'sub_test123',
					phases: expect.arrayContaining([
						expect.objectContaining({
							items: [{ price: 'price_starter_monthly' }]
						})
					])
				})
			)
		})

		it('should reject downgrade when usage exceeds target plan limits', async () => {
			// Arrange
			const downgradeRequest = {
				targetPlan: 'STARTER' as const,
				billingCycle: 'monthly' as const
			}

			const growthSubscription = {
				...mockSubscription,
				planType: 'GROWTH'
			}
			subscriptionManager.getSubscription.mockResolvedValue(
				growthSubscription as any
			)
			subscriptionManager.calculateUsageMetrics.mockResolvedValue({
				properties: 15, // Exceeds starter limit
				tenants: 10,
				maintenanceRequests: 15
			} as any)
			subscriptionManager.getUsageLimitsForPlan.mockResolvedValue({
				properties: 10, // Starter limit
				tenants: 50,
				maintenanceRequests: 100
			} as any)

			// Act
			const result = await service.downgradeSubscription(
				'user_test123',
				downgradeRequest
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toContain('Usage exceeds target plan limits')
			expect(
				stripeService.client.subscriptions.update
			).not.toHaveBeenCalled()
		})
	})

	describe('cancelSubscription', () => {
		it('should cancel subscription immediately', async () => {
			// Arrange
			const cancelRequest = {
				cancelAt: 'immediate' as const,
				reason: 'No longer needed',
				feedback: 'Great service, just not using it anymore'
			}

			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.cancel.mockResolvedValue({
				...mockStripeSubscription,
				status: 'canceled'
			})

			const mockSyncResult = {
				success: true,
				subscription: { ...mockSubscription, status: 'CANCELED' },
				changes: ['status: ACTIVE → CANCELED'],
				correlationId: 'test-correlation'
			}
			subscriptionSync.syncSubscriptionFromWebhook.mockResolvedValue(
				mockSyncResult as any
			)

			// Act
			const result = await service.cancelSubscription(
				'user_test123',
				cancelRequest
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.changes).toContain(
				'Subscription canceled immediately'
			)
			expect(
				stripeService.client.subscriptions.cancel
			).toHaveBeenCalledWith('sub_test123')
			expect(eventEmitter.emit).toHaveBeenCalledWith(
				'subscription.canceled',
				expect.objectContaining({
					userId: 'user_test123',
					fromPlan: 'STARTER',
					cancelAt: 'immediate',
					reason: 'No longer needed',
					feedback: 'Great service, just not using it anymore'
				})
			)
		})

		it('should schedule cancellation for end of period', async () => {
			// Arrange
			const cancelRequest = {
				cancelAt: 'end_of_period' as const,
				reason: 'Moving to competitor'
			}

			subscriptionManager.getSubscription.mockResolvedValue(
				mockSubscription
			)
			stripeService.client.subscriptions.update.mockResolvedValue({
				...mockStripeSubscription,
				cancel_at_period_end: true
			})

			const mockSyncResult = {
				success: true,
				subscription: { ...mockSubscription, cancelAtPeriodEnd: true },
				changes: ['cancelAtPeriodEnd: false → true'],
				correlationId: 'test-correlation'
			}
			subscriptionSync.syncSubscriptionFromWebhook.mockResolvedValue(
				mockSyncResult as any
			)

			// Act
			const result = await service.cancelSubscription(
				'user_test123',
				cancelRequest
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.changes).toContain(
				'Subscription canceled at the end of the current billing period'
			)
			expect(
				stripeService.client.subscriptions.update
			).toHaveBeenCalledWith('sub_test123', {
				cancel_at_period_end: true
			})
		})
	})

	describe('createCheckoutSession', () => {
		it('should create checkout session successfully', async () => {
			// Arrange
			prismaService.user.findUnique.mockResolvedValue(mockUser)
			stripeService.client.checkout.sessions.create.mockResolvedValue({
				id: 'cs_test123',
				url: 'https://checkout.stripe.com/pay/cs_test123'
			} as any)

			// Act
			const result = await service.createCheckoutSession(
				'user_test123',
				'GROWTH',
				'monthly',
				'https://example.com/success',
				'https://example.com/cancel'
			)

			// Assert
			expect(result.success).toBe(true)
			expect(result.checkoutUrl).toBe(
				'https://checkout.stripe.com/pay/cs_test123'
			)
			expect(
				stripeService.client.checkout.sessions.create
			).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: 'cus_test123',
					mode: 'subscription',
					line_items: [
						{
							price: 'price_growth_monthly',
							quantity: 1
						}
					]
				})
			)
		})

		it('should handle missing user or Stripe customer ID', async () => {
			// Arrange
			prismaService.user.findUnique.mockResolvedValue(null)

			// Act
			const result = await service.createCheckoutSession(
				'user_test123',
				'GROWTH',
				'monthly',
				'https://example.com/success',
				'https://example.com/cancel'
			)

			// Assert
			expect(result.success).toBe(false)
			expect(result.error).toBe('User not found or no Stripe customer ID')
			expect(
				stripeService.client.checkout.sessions.create
			).not.toHaveBeenCalled()
		})
	})
})
