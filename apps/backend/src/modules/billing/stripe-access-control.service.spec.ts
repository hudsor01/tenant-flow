import type { Logger } from '@nestjs/common'
import { Test, type TestingModule } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { StripeAccessControlService } from './stripe-access-control.service'

describe('StripeAccessControlService', () => {
	let service: StripeAccessControlService
	let supabaseService: jest.Mocked<SupabaseService>
	let mockLogger: jest.Mocked<Logger>

	beforeEach(async () => {
		// Mock SupabaseService
		const mockSupabaseService = {
			rpcWithRetries: jest.fn(),
			getAdminClient: jest.fn().mockReturnValue({
				rpc: jest.fn().mockReturnValue({
					single: jest.fn()
				})
			})
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeAccessControlService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		service = module.get<StripeAccessControlService>(StripeAccessControlService)

		// Mock logger to verify proper log levels
		mockLogger = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
			verbose: jest.fn(),
			fatal: jest.fn(),
			setLogLevels: jest.fn(),
			isLevelEnabled: jest.fn()
		} as any

		// Use Object.defineProperty to override readonly logger
		Object.defineProperty(service, 'logger', {
			value: mockLogger,
			writable: false,
			configurable: true
		})

		supabaseService = module.get<SupabaseService>(
			SupabaseService
		) as jest.Mocked<SupabaseService>
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})

	describe('grantSubscriptionAccess', () => {
		it('should grant access when user is found', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'active',
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.grantSubscriptionAccess(mockSubscription)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalledWith(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: 'cus_test123' },
				2
			)
		})

		it('should handle expanded customer object', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: { id: 'cus_test123' } as Stripe.Customer,
				status: 'active',
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.grantSubscriptionAccess(mockSubscription)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalledWith(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: 'cus_test123' },
				2
			)
		})

		it('should handle user not found gracefully', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'active',
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: null,
				error: { message: 'User not found' }
			})

			// Should not throw
			await expect(
				service.grantSubscriptionAccess(mockSubscription)
			).resolves.not.toThrow()
		})

		it('should handle database errors gracefully', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'active',
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockRejectedValue(
				new Error('Database connection failed')
			)

			// Should not throw - business logic failures should be logged but not stop webhook
			await expect(
				service.grantSubscriptionAccess(mockSubscription)
			).resolves.not.toThrow()
		})
	})

	describe('revokeSubscriptionAccess', () => {
		it('should revoke access when user is found', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'canceled',
				canceled_at: Math.floor(Date.now() / 1000),
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.revokeSubscriptionAccess(mockSubscription)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalledWith(
				'get_user_id_by_stripe_customer',
				{ p_stripe_customer_id: 'cus_test123' },
				2
			)
		})

		it('should handle user not found gracefully', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'canceled',
				items: {
					data: []
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: null,
				error: { message: 'User not found' }
			})

			await expect(
				service.revokeSubscriptionAccess(mockSubscription)
			).resolves.not.toThrow()
		})
	})

	describe('handleTrialEnding', () => {
		it('should calculate days remaining correctly', async () => {
			const trialEndTimestamp = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60 // 3 days from now

			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'trialing',
				trial_end: trialEndTimestamp,
				items: {
					data: [{ price: { id: 'price_test123' } }]
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.handleTrialEnding(mockSubscription)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalled()
		})

		it('should handle missing trial_end gracefully', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'trialing',
				trial_end: null,
				items: {
					data: []
				}
			} as Stripe.Subscription

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await expect(
				service.handleTrialEnding(mockSubscription)
			).resolves.not.toThrow()
		})
	})

	describe('handlePaymentFailed', () => {
		it('should log payment failure as warning (business event, not error)', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: 'cus_test123',
				subscription: 'sub_test123',
				amount_due: 2900,
				currency: 'usd',
				attempt_count: 1
			} as Stripe.Invoice & { subscription?: string }

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.handlePaymentFailed(mockInvoice)

			// Payment failure is a business event, should log as WARN not ERROR
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Payment failed',
				expect.objectContaining({
					userId: 'user-123',
					invoiceId: 'in_test123',
					subscriptionId: 'sub_test123'
				})
			)
			// Should NOT log as error
			expect(mockLogger.error).not.toHaveBeenCalledWith(
				'Payment failed',
				expect.any(Object)
			)
		})

		it('should handle invoice without customer gracefully', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: null,
				amount_due: 2900,
				currency: 'usd',
				attempt_count: 1
			} as Stripe.Invoice

			await expect(
				service.handlePaymentFailed(mockInvoice)
			).resolves.not.toThrow()
		})

		it('should handle expanded subscription object', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: 'cus_test123',
				subscription: {
					id: 'sub_test123'
				} as Stripe.Subscription,
				amount_due: 2900,
				currency: 'usd',
				attempt_count: 2
			} as Stripe.Invoice & { subscription?: Stripe.Subscription }

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.handlePaymentFailed(mockInvoice)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalled()
		})
	})

	describe('handlePaymentSucceeded', () => {
		it('should log payment success', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: 'cus_test123',
				subscription: 'sub_test123',
				amount_paid: 2900,
				currency: 'usd'
			} as Stripe.Invoice & { subscription?: string }

			supabaseService.rpcWithRetries.mockResolvedValue({
				data: 'user-123',
				error: null
			})

			await service.handlePaymentSucceeded(mockInvoice)

			expect(supabaseService.rpcWithRetries).toHaveBeenCalled()
		})

		it('should handle invoice without customer gracefully', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: null,
				amount_paid: 2900,
				currency: 'usd'
			} as Stripe.Invoice

			await expect(
				service.handlePaymentSucceeded(mockInvoice)
			).resolves.not.toThrow()
		})
	})

	describe('checkFeatureAccess', () => {
		it('should return true for granted features', async () => {
			const mockRpc = jest.fn().mockResolvedValue({
				data: true,
				error: null
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const hasAccess = await service.checkFeatureAccess(
				'user-123',
				'advanced_analytics'
			)

			expect(hasAccess).toBe(true)
		})

		it('should return false for denied features', async () => {
			const mockRpc = jest.fn().mockResolvedValue({
				data: false,
				error: null
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const hasAccess = await service.checkFeatureAccess(
				'user-123',
				'api_access'
			)

			expect(hasAccess).toBe(false)
		})

		it('should return false on database error', async () => {
			const mockRpc = jest.fn().mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const hasAccess = await service.checkFeatureAccess(
				'user-123',
				'bulk_operations'
			)

			expect(hasAccess).toBe(false)
		})

		it('should handle exceptions gracefully', async () => {
			const mockRpc = jest.fn().mockRejectedValue(new Error('Connection lost'))

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const hasAccess = await service.checkFeatureAccess(
				'user-123',
				'custom_reports'
			)

			expect(hasAccess).toBe(false)
		})
	})

	describe('getUserPlanLimits', () => {
		it('should return plan limits for user with subscription', async () => {
			const mockLimits = {
				property_limit: 50,
				unit_limit: 200,
				user_limit: 10,
				storage_gb: 50,
				has_api_access: true,
				has_white_label: false,
				support_level: 'priority'
			}

			const mockRpc = jest.fn().mockReturnValue({
				single: jest.fn().mockResolvedValue({
					data: mockLimits,
					error: null
				})
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const limits = await service.getUserPlanLimits('user-123')

			expect(limits).toEqual({
				propertyLimit: 50,
				unitLimit: 200,
				userLimit: 10,
				storageGB: 50,
				hasApiAccess: true,
				hasWhiteLabel: false,
				supportLevel: 'priority'
			})
		})

		it('should return null for user without subscription', async () => {
			const mockRpc = jest.fn().mockReturnValue({
				single: jest.fn().mockResolvedValue({
					data: null,
					error: null
				})
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const limits = await service.getUserPlanLimits('user-123')

			expect(limits).toBeNull()
		})

		it('should return null on database error', async () => {
			const mockRpc = jest.fn().mockReturnValue({
				single: jest.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' }
				})
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const limits = await service.getUserPlanLimits('user-123')

			expect(limits).toBeNull()
		})

		it('should handle exceptions gracefully', async () => {
			const mockRpc = jest.fn().mockReturnValue({
				single: jest.fn().mockRejectedValue(new Error('Connection lost'))
			})

			supabaseService.getAdminClient.mockReturnValue({
				rpc: mockRpc
			} as never)

			const limits = await service.getUserPlanLimits('user-123')

			expect(limits).toBeNull()
		})
	})

	describe('Error Handling', () => {
		it('should never throw errors from webhook handlers', async () => {
			const mockSubscription = {
				id: 'sub_test123',
				customer: 'cus_test123',
				status: 'active',
				items: {
					data: []
				}
			} as Stripe.Subscription

			// Simulate complete database failure
			supabaseService.rpcWithRetries.mockRejectedValue(
				new Error('Database is down')
			)

			// All methods should handle errors gracefully
			await expect(
				service.grantSubscriptionAccess(mockSubscription)
			).resolves.not.toThrow()
			await expect(
				service.revokeSubscriptionAccess(mockSubscription)
			).resolves.not.toThrow()
			await expect(
				service.handleTrialEnding(mockSubscription)
			).resolves.not.toThrow()
		})

		it('should never throw errors from invoice handlers', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: 'cus_test123',
				amount_due: 2900,
				currency: 'usd'
			} as Stripe.Invoice

			supabaseService.rpcWithRetries.mockRejectedValue(
				new Error('Database is down')
			)

			await expect(
				service.handlePaymentFailed(mockInvoice)
			).resolves.not.toThrow()
			await expect(
				service.handlePaymentSucceeded(mockInvoice)
			).resolves.not.toThrow()
		})

		it('should log system errors as ERROR (not business events)', async () => {
			const mockInvoice = {
				id: 'in_test123',
				customer: 'cus_test123',
				amount_due: 2900,
				currency: 'usd'
			} as Stripe.Invoice

			// Simulate system failure
			supabaseService.rpcWithRetries.mockRejectedValue(
				new Error('Database connection lost')
			)

			await service.handlePaymentFailed(mockInvoice)

			// System errors should log as ERROR
			expect(mockLogger.error).toHaveBeenCalledWith(
				'Failed to handle payment failure',
				expect.objectContaining({
					invoiceId: 'in_test123',
					error: 'Database connection lost'
				})
			)
		})
	})
})
