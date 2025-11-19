/**
 * CRITICAL PAYMENT WEBHOOK TESTS - Two Revenue Streams
 *
 * TenantFlow operates a two-sided marketplace with TWO distinct revenue flows:
 *
 * FLOW 1: SaaS Subscriptions (TenantFlow's Primary Revenue)
 * ════════════════════════════════════════════════════════
 * Property Managers → TenantFlow Platform
 * - Products: Starter ($29/mo), Growth ($99/mo), Max ($299/mo)
 * - Events: customer.subscription.*, invoice.payment_succeeded
 * - Tests: See stripe-sync-webhooks.spec.ts for subscription lifecycle tests
 *
 * FLOW 2: Rent Payments (Facilitated Transactions)
 * ═══════════════════════════════════════════════════
 * Tenants → Property Managers (via platform)
 * - Products: Variable rent amounts set by property managers
 * - Events: checkout.session.completed, payment_intent.succeeded
 * - Tests: THIS FILE - One-time payment processing and recording
 *
 * This file tests FLOW 2 (Rent Payments) to ensure:
 * - Tenant payments are properly recorded in rent_payments table
 * - checkout.session.completed triggers database writes
 * - Payment validation prevents recording unpaid sessions
 * - Idempotency prevents duplicate payment records
 * - Metadata validation protects data integrity
 *
 * For FLOW 1 (SaaS Subscription) tests, see:
 * - stripe-sync-webhooks.spec.ts (subscription lifecycle)
 *
 * Both revenue streams are equally critical but serve different purposes:
 * - FLOW 1: Your company's recurring revenue
 * - FLOW 2: Your users' trust in the platform
 *
 * @see https://docs.stripe.com/billing/subscriptions/webhooks (for SaaS subscriptions)
 * @see https://docs.stripe.com/payments/checkout (for one-time rent payments)
 * @see https://docs.stripe.com/billing/testing
 */

import { createMock } from '@golevelup/ts-jest'
import type { DeepMocked } from '@golevelup/ts-jest'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { StripeAccessControlService } from '../billing/stripe-access-control.service'
import { StripeSyncController } from './stripe-sync.controller'
import { StripeSyncService } from '../billing/stripe-sync.service'
import { WebhookMonitoringService } from './webhook-monitoring.service'
import { AppConfigService } from '../../config/app-config.service'
import { createMockAppConfigService } from '../../test-utils/mocks'

describe('StripeSyncController - Critical Payment Webhooks (Revenue)', () => {
	let controller: StripeSyncController
	let mockAdminClient: DeepMocked<SupabaseClient>
	let stripeSyncService: DeepMocked<StripeSyncService>
	let stripeClientService: DeepMocked<StripeClientService>
	let supabaseService: DeepMocked<SupabaseService>
	let accessControlService: DeepMocked<StripeAccessControlService>
	let webhookMonitoringService: DeepMocked<WebhookMonitoringService>

	const mockCustomerId = 'cus_test123'
	const mockSubscriptionId = 'sub_test123'
	const mockEventId = 'evt_test123'
	const mockSignature = 'test_signature'
	const mocklease_id = 'lease_test123'
	const mocktenant_id = 'tenant_test123'
	const mockOwnerId = 'owner_test123'
	const mockproperty_id = 'property_test123'
	const mockPaymentIntentId = 'pi_test123'
	const mockCheckoutSessionId = 'cs_test123'

	beforeEach(async () => {
		// Create type-safe mocks
		mockAdminClient = createMock<SupabaseClient>()
		stripeSyncService = createMock<StripeSyncService>()
		stripeClientService = createMock<StripeClientService>()
		accessControlService = createMock<StripeAccessControlService>()
		webhookMonitoringService = createMock<WebhookMonitoringService>()

		// Setup SupabaseService to return our mock client
		supabaseService = createMock<SupabaseService>()
		supabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		const module: TestingModule = await Test.createTestingModule({
			controllers: [StripeSyncController],
			providers: [
				{
					provide: StripeSyncService,
					useValue: stripeSyncService
				},
				{
					provide: StripeClientService,
					useValue: stripeClientService
				},
				{
					provide: SupabaseService,
					useValue: supabaseService
				},
				{
					provide: StripeAccessControlService,
					useValue: accessControlService
				},
				{
					provide: WebhookMonitoringService,
					useValue: webhookMonitoringService
				},
				{
					provide: AppConfigService,
					useValue: createMockAppConfigService()
				},
				{
					provide: CACHE_MANAGER,
					useValue: createMock()
				}
			]
		}).compile()

		controller = module.get<StripeSyncController>(StripeSyncController)

		// Spy on logger (suppress test output)
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'warn').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => {})
	})

	describe('checkout.session.completed - Rent Payment Processing (FLOW 2)', () => {
		it('should record rent payment when tenant completes checkout successfully', async () => {
			// Arrange: Tenant pays $1,500 monthly rent via Stripe Checkout
			// This tests FLOW 2: Tenant → Property Manager (facilitated transaction)
			const mockCheckoutSession: Stripe.Checkout.Session = {
				id: mockCheckoutSessionId,
				object: 'checkout.session',
				customer: mockCustomerId,
				payment_status: 'paid',
				payment_intent: mockPaymentIntentId,
				amount_total: 150000, // $1,500.00 monthly rent
				currency: 'usd',
				metadata: {
					lease_id: mocklease_id,
					tenant_id: mocktenant_id,
					paymentType: 'rent'
				}
			} as unknown as Stripe.Checkout.Session

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'checkout.session.completed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCheckoutSession
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: Event not processed yet (new event)
			const mockEventQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			// Mock: Lease query returns property with owner
			const mockLeaseQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						property_id: mockproperty_id,
						property: {
							owner_id: mockOwnerId
						}
					},
					error: null
				})
			}

			// Mock: Payment insert succeeds
			const mockPaymentQueryBuilder = {
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			// Setup mock to return different query builders based on table name
			mockAdminClient.from.mockImplementation((table: string) => {
				if (table === 'stripe_processed_events') {
					return mockEventQueryBuilder as any
				} else if (table === 'leases') {
					return mockLeaseQueryBuilder as any
				} else if (table === 'rent_payments') {
					return mockPaymentQueryBuilder as any
				}
				return createMock() as any
			})

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act: Process webhook
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Payment should be recorded in database
			expect(mockPaymentQueryBuilder.insert).toHaveBeenCalledWith({
			lease_id: mocklease_id,
			tenant_id: mocktenant_id,
			amount: 150000, // Amount in cents from Stripe
			due_date: expect.any(String),
			paid_date: expect.any(String),
			payment_method_type: 'rent',
			status: 'succeeded',
			stripe_payment_intent_id: mockPaymentIntentId,
			application_fee_amount: 0,
			currency: 'usd',
			period_start: expect.any(String),
			period_end: expect.any(String)
		})

			// Verify event was marked as processed
			expect(mockEventQueryBuilder.insert).toHaveBeenCalled()
		})

		it('should skip checkout session if payment status is not "paid"', async () => {
			// Arrange: Tenant abandoned checkout before completing payment
			// Per Stripe docs: Always verify payment_status === 'paid' before provisioning
			const mockCheckoutSession: Stripe.Checkout.Session = {
				id: mockCheckoutSessionId,
				object: 'checkout.session',
				customer: mockCustomerId,
				payment_status: 'unpaid', // Not paid yet
				payment_intent: mockPaymentIntentId,
				amount_total: 150000,
				currency: 'usd',
				metadata: {
					lease_id: mocklease_id,
					tenant_id: mocktenant_id,
					paymentType: 'rent'
				}
			} as unknown as Stripe.Checkout.Session

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'checkout.session.completed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCheckoutSession
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: No payment should be recorded (payment_status !== 'paid')
			// Only stripe_processed_events should be accessed
			const fromCalls = (mockAdminClient.from as jest.Mock).mock.calls
			const leaseTableCalls = fromCalls.filter(call => call[0] === 'leases')
			const paymentTableCalls = fromCalls.filter(
				call => call[0] === 'rent_payments'
			)

			expect(leaseTableCalls.length).toBe(0)
			expect(paymentTableCalls.length).toBe(0)
		})

		it('should handle missing metadata gracefully (validation)', async () => {
			// Arrange: Checkout session missing required metadata (lease_id, tenant_id)
			// This could occur if frontend doesn't include required fields
			const mockCheckoutSession: Stripe.Checkout.Session = {
				id: mockCheckoutSessionId,
				object: 'checkout.session',
				customer: mockCustomerId,
				payment_status: 'paid',
				payment_intent: mockPaymentIntentId,
				amount_total: 150000,
				currency: 'usd',
				metadata: {} // Missing lease_id and tenant_id
			} as unknown as Stripe.Checkout.Session

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'checkout.session.completed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCheckoutSession
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Should log error but not throw (webhook should succeed)
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Missing required metadata in checkout session',
				expect.any(Object)
			)

			// Should not attempt database insert
			const fromCalls = (mockAdminClient.from as jest.Mock).mock.calls
			const paymentCalls = fromCalls.filter(call => call[0] === 'rent_payments')
			expect(paymentCalls.length).toBe(0)
		})

		it('should handle duplicate checkout events gracefully (idempotency)', async () => {
			// Arrange: Stripe retries webhook, we already processed this rent payment
			// Per Stripe docs: Webhooks may be delivered multiple times
			// Must ensure idempotency to prevent double-recording tenant payments
			const mockCheckoutSession: Stripe.Checkout.Session = {
				id: mockCheckoutSessionId,
				object: 'checkout.session',
				customer: mockCustomerId,
				payment_status: 'paid',
				payment_intent: mockPaymentIntentId,
				amount_total: 150000,
				currency: 'usd',
				metadata: {
					lease_id: mocklease_id,
					tenant_id: mocktenant_id,
					paymentType: 'rent'
				}
			} as unknown as Stripe.Checkout.Session

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'checkout.session.completed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCheckoutSession
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockEventQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null })
			}

			const mockLeaseQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: {
						property_id: mockproperty_id,
						property: { owner_id: mockOwnerId }
					},
					error: null
				})
			}

			// Mock: Payment insert fails with duplicate key (23505)
			const mockPaymentQueryBuilder = {
				insert: jest.fn().mockResolvedValue({
					data: null,
					error: {
						code: '23505',
						message: 'duplicate key value violates unique constraint'
					}
				})
			}

			mockAdminClient.from.mockImplementation((table: string) => {
				if (table === 'stripe_processed_events') {
					return mockEventQueryBuilder as any
				} else if (table === 'leases') {
					return mockLeaseQueryBuilder as any
				} else if (table === 'rent_payments') {
					return mockPaymentQueryBuilder as any
				}
				return createMock() as any
			})

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Should log duplicate but not throw error
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Checkout payment already exists (webhook retry), skipping duplicate',
				expect.objectContaining({
					sessionId: mockCheckoutSessionId,
					stripePaymentIntentId: mockPaymentIntentId
				})
			)
		})
	})

	describe('payment_intent.succeeded - Payment Tracking', () => {
		it('should log payment success for tracking and analytics', async () => {
			// Arrange: Successful payment intent per Stripe docs
			const mockPaymentIntent: Stripe.PaymentIntent = {
				id: mockPaymentIntentId,
				object: 'payment_intent',
				customer: mockCustomerId,
				amount: 150000,
				currency: 'usd',
				status: 'succeeded'
			} as unknown as Stripe.PaymentIntent

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'payment_intent.succeeded',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockPaymentIntent
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Should log payment success
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Processing payment_intent.succeeded',
				expect.objectContaining({
					paymentIntentId: mockPaymentIntentId,
					customerId: mockCustomerId,
					amount: 150000,
					currency: 'usd',
					status: 'succeeded'
				})
			)
		})
	})

	describe('invoice.payment_succeeded - SaaS Subscription Recurring Payments', () => {
		it('should log successful subscription payment (access granted via subscription.updated)', async () => {
			// Arrange: Successful invoice payment for SaaS subscription (Starter/Growth/Max plan)
			// Example: Property Manager's monthly $29 Starter plan payment succeeds
			const mockInvoice: Stripe.Invoice = {
				id: 'in_test123',
				object: 'invoice',
				customer: mockCustomerId,
				subscription: mockSubscriptionId,
				status: 'paid',
				amount_paid: 2900, // $29.00 Starter plan
				currency: 'usd',
				paid: true
			} as unknown as Stripe.Invoice

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'invoice.payment_succeeded',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockInvoice
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Event should be processed successfully
			// Note: invoice.payment_succeeded logs the payment but doesn't trigger access directly
			// Access provisioning happens via customer.subscription.updated (status: 'active')
			// This separation follows Stripe's recommended pattern
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
			expect(mockQueryBuilder.insert).toHaveBeenCalled()
		})
	})

	describe('invoice.payment_failed - SaaS Subscription Payment Failures', () => {
		it('should handle failed subscription payment (triggers dunning process)', async () => {
			// Arrange: Failed invoice payment for SaaS subscription
			// Example: Property Manager's credit card declined for $29 Starter plan
			const mockInvoice: Stripe.Invoice = {
				id: 'in_test_failed',
				object: 'invoice',
				customer: mockCustomerId,
				subscription: mockSubscriptionId,
				status: 'open',
				amount_due: 2900, // $29.00 Starter plan
				currency: 'usd',
				paid: false,
				attempt_count: 1
			} as unknown as Stripe.Invoice

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'invoice.payment_failed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockInvoice
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Event should be processed without throwing
			// Note: Payment failure triggers customer.subscription.updated with 'past_due' status
			// Access revocation happens via that event
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
		})
	})

	describe('Webhook Error Handling - Revenue Protection', () => {
		it('should throw BadRequestException for missing signature', async () => {
			// Act & Assert
			await expect(
				controller.handleStripeSyncWebhook({
					body: Buffer.from('test'),
					headers: {} // Missing stripe-signature
				} as any)
			).rejects.toThrow('Missing Stripe signature')
		})

		it('should throw BadRequestException for invalid signature', async () => {
			// Arrange: Stripe Sync Service throws on invalid signature
			stripeSyncService.processWebhook.mockRejectedValue(
				new Error('Invalid signature')
			)

			// Act & Assert
			await expect(
				controller.handleStripeSyncWebhook({
					body: Buffer.from('test'),
					headers: { 'stripe-signature': 'invalid' }
				} as any)
			).rejects.toThrow('Webhook processing failed')
		})

		it('should throw BadRequestException for missing raw body', async () => {
			// Act & Assert
			await expect(
				controller.handleStripeSyncWebhook({
					body: 'not a buffer', // Should be Buffer
					headers: { 'stripe-signature': mockSignature }
				} as any)
			).rejects.toThrow('Missing raw body for signature verification')
		})
	})

	describe('Test Card Numbers - Per Stripe Official Docs', () => {
		/**
		 * These test scenarios use Stripe's official test card numbers
		 * @see https://docs.stripe.com/testing#cards
		 */

		it('should handle successful payment with test card 4242 4242 4242 4242', async () => {
			// This test validates behavior with Stripe's standard test card
			// In production webhooks, this would represent a successful charge
			const mockPaymentIntent: Stripe.PaymentIntent = {
				id: mockPaymentIntentId,
				object: 'payment_intent',
				customer: mockCustomerId,
				amount: 5000,
				currency: 'usd',
				status: 'succeeded',
				payment_method: 'pm_card_visa' // Stripe test card
			} as unknown as Stripe.PaymentIntent

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'payment_intent.succeeded',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockPaymentIntent
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Processing payment_intent.succeeded',
				expect.objectContaining({
					status: 'succeeded'
				})
			)
		})

		it('should handle declined payment (simulating card 4000 0000 0000 0002)', async () => {
			// This simulates what happens when test card 4000 0000 0000 0002 is used
			// Stripe docs: This card will be declined with a generic decline code
			const mockPaymentIntent: Stripe.PaymentIntent = {
				id: mockPaymentIntentId,
				object: 'payment_intent',
				customer: mockCustomerId,
				amount: 5000,
				currency: 'usd',
				status: 'requires_payment_method',
				last_payment_error: {
					code: 'card_declined',
					decline_code: 'generic_decline',
					message: 'Your card was declined.'
				}
			} as unknown as Stripe.PaymentIntent

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'payment_intent.payment_failed',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockPaymentIntent
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Should process without errors (business logic handles decline)
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
		})
	})
})
