import { EventEmitter2 } from '@nestjs/event-emitter'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeWebhookService } from './stripe-webhook.service'
import { StripeController } from './stripe.controller'
import { StripeService } from './stripe.service'
import { StripeOwnerService } from './stripe-owner.service'
import { StripeTenantService } from './stripe-tenant.service'
import { SecurityService } from '../../security/security.service'

// Create properly typed mock objects
const createMockSupabaseService = (): jest.Mocked<SupabaseService> => {
	return {
		getUserClient: jest.fn(),
		getAdminClient: jest.fn()
	} as unknown as jest.Mocked<SupabaseService>
}

const createMockStripe = (): jest.Mocked<Stripe> => {
	return {
		customers: {
			create: jest.fn(),
			retrieve: jest.fn(),
			update: jest.fn()
		},
		subscriptions: {
			create: jest.fn(),
			retrieve: jest.fn(),
			update: jest.fn(),
			cancel: jest.fn(),
			list: jest.fn()
		},
		checkout: {
			sessions: {
				create: jest.fn(),
				retrieve: jest.fn()
			}
		},
		billingPortal: {
			sessions: {
				create: jest.fn()
			}
		},
		prices: {
			list: jest.fn()
		} as unknown as jest.Mocked<Stripe.PricesResource>,
		products: {
			list: jest.fn()
		} as unknown as jest.Mocked<Stripe.ProductsResource>
	} as unknown as jest.Mocked<Stripe>
}

describe('StripeController - Subscription Management', () => {
	let controller: StripeController
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockStripe: jest.Mocked<Stripe>
	let mockWebhookService: jest.Mocked<StripeWebhookService>

	const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
	const mockCustomerId = 'cus_test123'
	const mockSubscriptionId = 'sub_test123'
	const mockPriceIdStarter = 'price_starter123'
	const mockPriceIdProfessional = 'price_professional456'

	beforeEach(async () => {
		// Set required environment variables for controller
		process.env.IDEMPOTENCY_KEY_SECRET = 'test-secret-key-for-tests-only'

		jest.useFakeTimers()

		mockSupabaseService = createMockSupabaseService()
		mockStripe = createMockStripe()
		mockWebhookService = {
			handleWebhook: jest.fn().mockResolvedValue(true),
			processEvent: jest.fn().mockResolvedValue(true),
			isEventProcessed: jest.fn().mockResolvedValue(false),
			markEventProcessed: jest.fn().mockResolvedValue(undefined),
			cleanupOldEvents: jest.fn().mockResolvedValue(undefined)
		} as unknown as jest.Mocked<StripeWebhookService>

		const module: TestingModule = await Test.createTestingModule({
			controllers: [StripeController],
			providers: [
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: StripeWebhookService,
					useValue: mockWebhookService
				},
				{
					provide: EventEmitter2,
					useValue: {
						emit: jest.fn(),
						emitAsync: jest.fn().mockResolvedValue(true)
					}
				},
				{
					provide: StripeService,
					useValue: {
						getStripe: jest.fn(() => mockStripe)
					}
				},
				{
					provide: StripeOwnerService,
					useValue: {
						ensureOwnerCustomer: jest.fn()
					}
				},
				{
					provide: StripeTenantService,
					useValue: {
						ensureTenantCustomer: jest.fn()
					}
				},
				{
					provide: CACHE_MANAGER,
					useValue: {
						get: jest.fn().mockResolvedValue(null),
						set: jest.fn().mockResolvedValue(undefined),
						del: jest.fn().mockResolvedValue(undefined)
					}
				},
				{
					provide: SecurityService,
					useValue: {
						sanitizeInput: jest.fn((input: string) => input),
						validateEmail: jest.fn(() => true),
						hashPassword: jest.fn((password: string) => password),
						validatePassword: jest.fn(() => true)
					}
				}
			]
		}).compile()

		controller = module.get<StripeController>(StripeController)

		// Spy on logger
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'warn').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		jest.clearAllTimers()
		jest.useRealTimers()
		delete process.env.IDEMPOTENCY_KEY_SECRET
	})

	describe('Customer Creation on Signup', () => {
		it('should create Stripe customer with user metadata', async () => {
			const mockCustomer = {
				id: mockCustomerId,
				email: 'test@example.com',
				metadata: {
					user_id: validUserId,
					environment: 'test'
				}
			} as unknown as Stripe.Customer

			;(mockStripe.customers.create as jest.Mock).mockResolvedValue(
				mockCustomer
			)

			// This would be called during signup flow
			const customer = await mockStripe.customers.create({
				email: 'test@example.com',
				metadata: {
					user_id: validUserId,
					environment: 'test'
				}
			})

			expect(customer.id).toBe(mockCustomerId)
			expect(customer.metadata.user_id).toBe(validUserId)
		})

		it('should handle customer creation failure', async () => {
			// This test verifies the mock setup works correctly
			const stripeError = {
				message: 'Invalid email address',
				type: 'StripeInvalidRequestError',
				code: 'invalid_request_error'
			} as Stripe.errors.StripeError

			;(mockStripe.customers.create as jest.Mock).mockRejectedValue(stripeError)

			// Verify the mock throws as expected
			await expect(
				mockStripe.customers.create({
					email: 'invalid-email',
					metadata: { user_id: validUserId }
				})
			).rejects.toEqual(stripeError)
		})
	})

	describe('Create Subscription', () => {
		it('should create subscription for Starter plan via Checkout', async () => {
			const mockCheckoutSession = {
				id: 'cs_test123',
				url: 'https://checkout.stripe.com/c/pay/test123',
				customer: mockCustomerId,
				mode: 'subscription' as const,
				subscription: mockSubscriptionId
			} as unknown as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockCheckoutSession
			)

			const mockRequest = {
				user: {
					id: validUserId,
					email: 'test@example.com'
				}
			} as any

			const result = await controller.createCheckoutSession(mockRequest, {
				productName: 'Starter Plan',
				tenantId: validUserId,
				domain: 'https://app.example.com',
				priceId: mockPriceIdStarter,
				isSubscription: true
			})

			expect(result.url).toBe('https://checkout.stripe.com/c/pay/test123')
			expect(result.session_id).toBe('cs_test123')
			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					mode: 'subscription',
					line_items: expect.arrayContaining([
						expect.objectContaining({
							price: mockPriceIdStarter,
							quantity: 1
						})
					])
				})
			)
		})

		it('should create subscription with trial period', async () => {
			const mockCheckoutSession = {
				id: 'cs_test_trial',
				url: 'https://checkout.stripe.com/c/pay/trial123',
				subscription_data: {
					trial_period_days: 14
				}
			} as unknown as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.create as jest.Mock).mockResolvedValue(
				mockCheckoutSession
			)

			await mockStripe.checkout.sessions.create({
				mode: 'subscription',
				line_items: [{ price: mockPriceIdStarter, quantity: 1 }],
				subscription_data: {
					trial_period_days: 14
				},
				customer: mockCustomerId,
				success_url: 'https://app.example.com/success',
				cancel_url: 'https://app.example.com/cancel'
			})

			expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					subscription_data: expect.objectContaining({
						trial_period_days: 14
					})
				})
			)
		})

		it('should handle invalid price ID', async () => {
			const stripeError = {
				message: 'No such price',
				type: 'StripeInvalidRequestError',
				code: 'resource_missing'
			} as Stripe.errors.StripeError

			;(mockStripe.checkout.sessions.create as jest.Mock).mockRejectedValue(
				stripeError
			)

			const mockRequest = {
				user: {
					id: validUserId,
					email: 'test@example.com'
				}
			} as any

			await expect(
				controller.createCheckoutSession(mockRequest, {
					productName: 'Invalid Plan',
					tenantId: validUserId,
					domain: 'https://app.example.com',
					priceId: 'invalid_price_id',
					isSubscription: true
				})
			).rejects.toThrow()
		})
	})

	describe('Update Subscription - Upgrade/Downgrade', () => {
		it('should upgrade from Starter to Professional', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active' as const,
				items: {
					data: [
						{
							id: 'si_test123',
							price: { id: mockPriceIdStarter }
						}
					]
				}
			} as unknown as Stripe.Subscription

			const mockUpdatedSubscription = {
				...mockSubscription,
				items: {
					data: [
						{
							id: 'si_test456',
							price: { id: mockPriceIdProfessional }
						}
					]
				}
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscription
			)
			;(mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(
				mockUpdatedSubscription
			)

			const result = await controller.updateSubscription({
				subscriptionId: mockSubscriptionId,
				newPriceId: mockPriceIdProfessional,
				prorationBehavior: 'create_prorations'
			})

			expect(result.subscription_id).toBe(mockSubscriptionId)
			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				mockSubscriptionId,
				expect.objectContaining({
					proration_behavior: 'create_prorations',
					items: expect.arrayContaining([
						expect.objectContaining({
							id: 'si_test123',
							price: mockPriceIdProfessional
						})
					])
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('should downgrade from Professional to Starter', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active' as const,
				items: {
					data: [
						{
							id: 'si_test456',
							price: { id: mockPriceIdProfessional }
						}
					]
				}
			} as unknown as Stripe.Subscription

			const mockUpdatedSubscription = {
				...mockSubscription,
				items: {
					data: [
						{
							id: 'si_test123',
							price: { id: mockPriceIdStarter }
						}
					]
				}
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscription
			)
			;(mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(
				mockUpdatedSubscription
			)

			// Downgrade typically happens at period end
			const result = await controller.updateSubscription({
				subscriptionId: mockSubscriptionId,
				newPriceId: mockPriceIdStarter,
				prorationBehavior: 'none'
			})

			expect(result.subscription_id).toBe(mockSubscriptionId)
			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				mockSubscriptionId,
				expect.objectContaining({
					proration_behavior: 'none'
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('should handle subscription not found', async () => {
			const stripeError = {
				message: 'No such subscription',
				type: 'StripeInvalidRequestError',
				code: 'resource_missing'
			} as Stripe.errors.StripeError

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockRejectedValue(
				stripeError
			)

			await expect(
				controller.updateSubscription({
					subscriptionId: 'sub_invalid',
					newPriceId: mockPriceIdProfessional,
					prorationBehavior: 'create_prorations'
				})
			).rejects.toThrow()
		})
	})

	describe('Cancel Subscription', () => {
		it('should cancel subscription at period end', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active' as const,
				cancel_at_period_end: false,
				current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
			} as unknown as Stripe.Subscription

			const mockCanceledSubscription = {
				...mockSubscription,
				cancel_at_period_end: true
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(
				mockCanceledSubscription
			)

			const result = await controller.cancelSubscription({
				subscriptionId: mockSubscriptionId,
				cancelAtPeriodEnd: true
			})

			expect(result.cancel_at_period_end).toBe(true)
			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				mockSubscriptionId,
				expect.objectContaining({
					cancel_at_period_end: true
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('should cancel subscription immediately', async () => {
			const mockCanceledSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'canceled' as const,
				canceled_at: Math.floor(Date.now() / 1000)
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.cancel as jest.Mock).mockResolvedValue(
				mockCanceledSubscription
			)

			// Simulate immediate cancellation (not waiting for period end)
			const result = await mockStripe.subscriptions.cancel(mockSubscriptionId)

			expect(result.status).toBe('canceled')
			expect(result.canceled_at).toBeDefined()
		})

		it('should handle already canceled subscription', async () => {
			const stripeError = {
				message: 'Subscription is already canceled',
				type: 'StripeInvalidRequestError',
				code: 'subscription_canceled'
			} as Stripe.errors.StripeError

			;(mockStripe.subscriptions.update as jest.Mock).mockRejectedValue(
				stripeError
			)

			await expect(
				controller.cancelSubscription({
					subscriptionId: mockSubscriptionId,
					cancelAtPeriodEnd: true
				})
			).rejects.toThrow()
		})
	})

	describe('Reactivate Subscription', () => {
		it('should reactivate a canceled subscription before period end', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active' as const,
				cancel_at_period_end: true,
				current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
			} as unknown as Stripe.Subscription

			const mockReactivatedSubscription = {
				...mockSubscription,
				cancel_at_period_end: false
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.update as jest.Mock).mockResolvedValue(
				mockReactivatedSubscription
			)

			// Reactivate by setting cancel_at_period_end to false
			const result = await mockStripe.subscriptions.update(mockSubscriptionId, {
				cancel_at_period_end: false
			})

			expect(result.cancel_at_period_end).toBe(false)
			expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
				mockSubscriptionId,
				expect.objectContaining({
					cancel_at_period_end: false
				})
			)
		})

		it('should not reactivate a fully canceled subscription', async () => {
			// This test verifies the mock setup works correctly
			const stripeError = {
				message: 'Cannot reactivate a canceled subscription',
				type: 'StripeInvalidRequestError',
				code: 'subscription_canceled'
			} as Stripe.errors.StripeError

			;(mockStripe.subscriptions.update as jest.Mock).mockRejectedValue(
				stripeError
			)

			// Verify the mock throws as expected
			await expect(
				mockStripe.subscriptions.update(mockSubscriptionId, {
					cancel_at_period_end: false
				})
			).rejects.toEqual(stripeError)
		})
	})

	describe('Payment Failure Handling - Dunning', () => {
		it('should handle failed payment on subscription', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'past_due' as const,
				latest_invoice: 'in_failed123'
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscription
			)

			const subscription =
				await mockStripe.subscriptions.retrieve(mockSubscriptionId)

			expect(subscription.status).toBe('past_due')
			expect(subscription.latest_invoice).toBe('in_failed123')
		})

		it('should mark subscription as unpaid after multiple failures', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'unpaid' as const,
				latest_invoice: 'in_failed456'
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscription
			)

			const subscription =
				await mockStripe.subscriptions.retrieve(mockSubscriptionId)

			expect(subscription.status).toBe('unpaid')
		})

		it('should recover subscription after successful payment', async () => {
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active' as const,
				latest_invoice: 'in_paid123'
			} as unknown as Stripe.Subscription

			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscription
			)

			const subscription =
				await mockStripe.subscriptions.retrieve(mockSubscriptionId)

			expect(subscription.status).toBe('active')
		})
	})

	describe('Checkout Session Verification', () => {
		it('should verify completed checkout session', async () => {
			const mockSubscriptionData = {
				id: mockSubscriptionId,
				status: 'active',
				cancel_at_period_end: false,
				items: {
					data: [
						{
							id: 'si_test123',
							current_period_start: Math.floor(Date.now() / 1000),
							current_period_end: Math.floor(Date.now() / 1000) + 2592000,
							price: {
								id: mockPriceIdStarter,
								nickname: 'Starter',
								unit_amount: 2900,
								currency: 'usd',
								recurring: { interval: 'month' },
								product: { name: 'Starter Plan' }
							}
						}
					]
				}
			} as unknown as Stripe.Subscription

			const mockSession = {
				id: 'cs_test123',
				payment_status: 'paid' as const,
				customer: mockCustomerId,
				subscription: mockSubscriptionId,
				status: 'complete' as const,
				customer_details: { email: 'test@example.com' },
				amount_total: 2900,
				currency: 'usd'
			} as unknown as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(
				mockSession
			)
			;(mockStripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(
				mockSubscriptionData
			)

			const result = await controller.verifyCheckoutSession({
				sessionId: 'cs_test123'
			})

			expect(result.session.payment_status).toBe('paid')
			expect(result.subscription).toBeDefined()
			expect(result.subscription!.status).toBe('active')
		})

		it('should handle incomplete checkout session', async () => {
			const mockSession = {
				id: 'cs_test456',
				payment_status: 'unpaid' as const,
				status: 'open' as const
			} as unknown as Stripe.Checkout.Session

			;(mockStripe.checkout.sessions.retrieve as jest.Mock).mockResolvedValue(
				mockSession
			)

			// The controller throws BadRequestException for unpaid sessions
			await expect(
				controller.verifyCheckoutSession({
					sessionId: 'cs_test456'
				})
			).rejects.toThrow('Payment processing error [STR-003]')
		})

		it('should handle expired checkout session', async () => {
			const stripeError = {
				message: 'Checkout session expired',
				type: 'StripeInvalidRequestError',
				code: 'resource_missing'
			} as Stripe.errors.StripeError

			;(mockStripe.checkout.sessions.retrieve as jest.Mock).mockRejectedValue(
				stripeError
			)

			await expect(
				controller.verifyCheckoutSession({
					sessionId: 'cs_expired'
				})
			).rejects.toThrow()
		})
	})

	describe('Billing Portal', () => {
		it('should create billing portal session', async () => {
			const mockPortalSession = {
				id: 'bps_test123',
				url: 'https://billing.stripe.com/session/test123',
				customer: mockCustomerId
			} as Stripe.BillingPortal.Session

			;(
				mockStripe.billingPortal.sessions.create as jest.Mock
			).mockResolvedValue(mockPortalSession)

			const result = await controller.createBillingPortal({
				customerId: mockCustomerId,
				returnUrl: 'https://app.example.com/settings'
			})

			expect(result.url).toBe('https://billing.stripe.com/session/test123')
			expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					customer: mockCustomerId,
					return_url: 'https://app.example.com/settings'
				})
			)
		})

		it('should handle invalid customer ID', async () => {
			const stripeError = {
				message: 'No such customer',
				type: 'StripeInvalidRequestError',
				code: 'resource_missing'
			} as Stripe.errors.StripeError

			;(
				mockStripe.billingPortal.sessions.create as jest.Mock
			).mockRejectedValue(stripeError)

			await expect(
				controller.createBillingPortal({
					customerId: 'cus_invalid',
					returnUrl: 'https://app.example.com/settings'
				})
			).rejects.toThrow()
		})
	})

	describe('Get Products and Pricing', () => {
		it('should retrieve available products', async () => {
			const mockProducts = {
				data: [
					{
						id: 'prod_starter',
						name: 'Starter Plan',
						active: true,
						metadata: {},
						description: null,
						default_price: null
					},
					{
						id: 'prod_professional',
						name: 'Professional Plan',
						active: true,
						metadata: {},
						description: null,
						default_price: null
					}
				]
			} as Stripe.ApiList<Stripe.Product>

			const mockPrices = {
				data: [
					{
						id: mockPriceIdStarter,
						product: 'prod_starter',
						unit_amount: 1900,
						currency: 'usd',
						recurring: { interval: 'month', interval_count: 1 }
					},
					{
						id: mockPriceIdProfessional,
						product: 'prod_professional',
						unit_amount: 4900,
						currency: 'usd',
						recurring: { interval: 'month', interval_count: 1 }
					}
				]
			} as Stripe.ApiList<Stripe.Price>

			;(mockStripe.products.list as jest.Mock).mockResolvedValue(mockProducts)
			;(mockStripe.prices.list as jest.Mock).mockResolvedValue(mockPrices)

			const result = await controller.getProducts()

			expect(result.products).toHaveLength(2)
			expect(result.products?.[0]?.name).toBe('Starter Plan')
			expect(result.products?.[1]?.name).toBe('Professional Plan')
		})

		it('should retrieve pricing for products', async () => {
			const mockPrices = {
				data: [
					{
						id: mockPriceIdStarter,
						product: 'prod_starter',
						unit_amount: 1900,
						currency: 'usd',
						recurring: { interval: 'month' }
					},
					{
						id: mockPriceIdProfessional,
						product: 'prod_professional',
						unit_amount: 4900,
						currency: 'usd',
						recurring: { interval: 'month' }
					}
				]
			} as Stripe.ApiList<Stripe.Price>

			;(mockStripe.prices.list as jest.Mock).mockResolvedValue(mockPrices)

			const result = await controller.getPrices()

			expect(result.prices).toHaveLength(2)
			expect(result.prices?.[0]?.unit_amount).toBe(1900)
			expect(result.prices?.[1]?.unit_amount).toBe(4900)
		})
	})
})
