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

describe('StripeSyncController - Webhook Processing', () => {
	let controller: StripeSyncController
	let mockAdminClient: DeepMocked<SupabaseClient>
	let stripeSyncService: DeepMocked<StripeSyncService>
	let stripeClientService: DeepMocked<StripeClientService>
	let supabaseService: DeepMocked<SupabaseService>
	let accessControlService: DeepMocked<StripeAccessControlService>
	let webhookMonitoringService: DeepMocked<WebhookMonitoringService>
	let appConfigService: DeepMocked<AppConfigService>

	const validuser_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
	const mockCustomerId = 'cus_test123'
	const mockSubscriptionId = 'sub_test123'
	const mockEventId = 'evt_test123'
	const mockSignature = 'test_signature'

	beforeEach(async () => {
		// Create type-safe mocks using @golevelup/ts-jest
		mockAdminClient = createMock<SupabaseClient>()
		stripeSyncService = createMock<StripeSyncService>()
		stripeClientService = createMock<StripeClientService>()
		accessControlService = createMock<StripeAccessControlService>()
		webhookMonitoringService = createMock<WebhookMonitoringService>()
		appConfigService = createMock<AppConfigService>()
		appConfigService.getStripeWebhookSecret.mockReturnValue('whsec_test')

		// Setup SupabaseService to return our mock client
		supabaseService = createMock<SupabaseService>()
		supabaseService.getAdminClient.mockReturnValue(mockAdminClient)

		// Mock accessControlService methods to resolve successfully
		accessControlService.grantSubscriptionAccess.mockResolvedValue(undefined)
		accessControlService.revokeSubscriptionAccess.mockResolvedValue(undefined)

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
					provide: AppConfigService,
					useValue: appConfigService
				},
				{
					provide: WebhookMonitoringService,
					useValue: webhookMonitoringService
				},
				{
					provide: CACHE_MANAGER,
					useValue: createMock()
				}
			]
		}).compile()

		controller = module.get<StripeSyncController>(StripeSyncController)

		// Spy on logger
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'warn').mockImplementation(() => {})
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => {})
	})

	describe('Webhook Event Idempotency', () => {
		it('should process new event', async () => {
			// Arrange: Create mock Stripe event
			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.created',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: {
						id: mockSubscriptionId,
						customer: mockCustomerId,
						status: 'active'
					} as unknown as Stripe.Subscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event has not been processed (returns null for new events)
			const mockQueryBuilder = {
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
				insert: jest.fn().mockResolvedValue({ data: null, error: null })
			}
			mockAdminClient.from.mockReturnValue(mockQueryBuilder as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act: Process webhook
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Verify access was granted
			expect(accessControlService.grantSubscriptionAccess).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockSubscriptionId,
					status: 'active'
				})
			)

			// Verify event was marked as processed
			expect(mockAdminClient.from).toHaveBeenCalledWith(
				'stripe_processed_events'
			)
		})

		it('should skip duplicate event', async () => {
			// Arrange: Create mock event that's already been processed
			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.created',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: {
						id: mockSubscriptionId,
						customer: mockCustomerId,
						status: 'active'
					} as unknown as Stripe.Subscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event already processed (returns existing record)
			mockAdminClient.from.mockReturnValue({
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockResolvedValue({
					data: { id: '123', event_id: mockEventId, processed: true },
					error: null
				})
			} as any)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act: Process webhook
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Access control should NOT be called for duplicate events
			expect(
				accessControlService.grantSubscriptionAccess
			).not.toHaveBeenCalled()
		})

		it('should handle concurrent duplicate events gracefully', async () => {
			// Arrange: Simulate race condition where multiple webhooks arrive simultaneously
			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.created',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: {
						id: mockSubscriptionId,
						customer: mockCustomerId,
						status: 'active'
					} as unknown as Stripe.Subscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: First check shows not processed, then insert fails due to unique constraint
			let callCount = 0
			mockAdminClient.from.mockImplementation(
				() =>
					({
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						insert: jest.fn().mockReturnThis(),
						single: jest.fn().mockImplementation(() => {
							callCount++
							if (callCount === 1) {
								// First call: event not found
								return Promise.resolve({
									data: null,
									error: { code: 'PGRST116' }
								})
							} else {
								// Second call after failed insert: event now exists
								return Promise.resolve({
									data: { id: '123', event_id: mockEventId },
									error: null
								})
							}
						})
					}) as any
			)

			stripeClientService.constructWebhookEvent.mockReturnValue(mockEvent)

			// Act: Process webhook
			const rawBody = Buffer.from(JSON.stringify(mockEvent))
			await controller.handleStripeSyncWebhook({
				body: rawBody,
				headers: { 'stripe-signature': mockSignature }
			} as any)

			// Assert: Should handle gracefully without throwing
			expect(mockAdminClient.from).toHaveBeenCalled()
		})
	})

	describe('Subscription Webhooks', () => {
		it('should handle customer.subscription.created', async () => {
			// Arrange
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'active',
				current_period_start: Math.floor(Date.now() / 1000),
				current_period_end: Math.floor(Date.now() / 1000) + 2592000,
				items: {
					object: 'list',
					data: []
				}
			} as unknown as Stripe.Subscription

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.created',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockSubscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed yet
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
			expect(accessControlService.grantSubscriptionAccess).toHaveBeenCalledWith(
				mockSubscription
			)
		})

		it('should handle customer.subscription.updated', async () => {
			// Arrange
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'past_due',
				current_period_start: Math.floor(Date.now() / 1000),
				current_period_end: Math.floor(Date.now() / 1000) + 2592000,
				items: {
					object: 'list',
					data: []
				}
			} as unknown as Stripe.Subscription

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.updated',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockSubscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed
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

			// Assert - past_due should revoke access
			expect(
				accessControlService.revokeSubscriptionAccess
			).toHaveBeenCalledWith(mockSubscription)
		})

		it('should handle customer.subscription.deleted', async () => {
			// Arrange
			const mockSubscription = {
				id: mockSubscriptionId,
				customer: mockCustomerId,
				status: 'canceled',
				current_period_start: Math.floor(Date.now() / 1000) - 2592000,
				current_period_end: Math.floor(Date.now() / 1000),
				items: {
					object: 'list',
					data: []
				}
			} as unknown as Stripe.Subscription

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.subscription.deleted',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockSubscription
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed
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

			// Assert - deleted should revoke access with full subscription object
			expect(
				accessControlService.revokeSubscriptionAccess
			).toHaveBeenCalledWith(mockSubscription)
		})
	})

	describe('Customer Webhooks', () => {
		it('should handle customer.created', async () => {
			// Arrange
			const mockCustomer: Stripe.Customer = {
				id: mockCustomerId,
				email: 'test@example.com',
				metadata: { user_id: validuser_id }
			} as unknown as Stripe.Customer

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.created',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCustomer
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed
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

			// Assert: Should process without errors
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
		})

		it('should handle customer.updated', async () => {
			// Arrange
			const mockCustomer: Stripe.Customer = {
				id: mockCustomerId,
				email: 'updated@example.com',
				metadata: { user_id: validuser_id }
			} as unknown as Stripe.Customer

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.updated',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCustomer
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed
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
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
		})

		it('should handle customer.deleted', async () => {
			// Arrange
			const mockCustomer: Stripe.Customer = {
				id: mockCustomerId,
				email: 'deleted@example.com',
				metadata: { user_id: validuser_id }
			} as unknown as Stripe.Customer

			const mockEvent: Stripe.Event = {
				id: mockEventId,
				type: 'customer.deleted',
				object: 'event',
				api_version: '2025-10-29.clover',
				created: Math.floor(Date.now() / 1000),
				data: {
					object: mockCustomer
				},
				livemode: false,
				pending_webhooks: 0,
				request: null
			}

			// Mock: event not processed
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
			expect(stripeClientService.constructWebhookEvent).toHaveBeenCalled()
		})
	})
})
