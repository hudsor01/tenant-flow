import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeWebhookService } from './stripe-webhook.service'

describe('StripeWebhookService', () => {
	let service: StripeWebhookService

	const mockSupabaseClient = () => {
		const mock: any = {}
		mock.from = jest.fn().mockReturnValue(mock)
		mock.select = jest.fn().mockReturnValue(mock)
		mock.insert = jest.fn().mockReturnValue(mock)
		mock.update = jest.fn().mockReturnValue(mock)
		mock.eq = jest.fn().mockReturnValue(mock)
		mock.single = jest.fn().mockReturnValue(mock)
		return mock
	}

	let supabaseClient = mockSupabaseClient()

	const mockSupabaseService = {
		getAdminClient: jest.fn(() => supabaseClient)
	}

	beforeEach(async () => {
		supabaseClient = mockSupabaseClient()
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeWebhookService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: Stripe,
					useValue: {
						charges: {
							retrieve: jest.fn()
						},
						transfers: {
							createReversal: jest.fn()
						}
					}
				}
			]
		}).compile()

		service = module.get<StripeWebhookService>(StripeWebhookService)
		// supabaseService = module.get<SupabaseService>(SupabaseService) // not needed, use mockSupabaseService
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('storeEventId', () => {
		it('should store event ID for idempotency', async () => {
			await service.storeEventId('evt_test123', 'payment_intent.succeeded')

			expect(supabaseClient.insert).toHaveBeenCalledWith([
				{
					eventId: 'evt_test123',
					type: 'payment_intent.succeeded'
				}
			])
		})

		it('should store compound idempotency keys when object ID provided', async () => {
			await service.storeEventId(
				'evt_test123',
				'payment_intent.succeeded',
				'pi_123'
			)

			expect(supabaseClient.insert).toHaveBeenCalledWith([
				{
					eventId: 'evt_test123',
					type: 'payment_intent.succeeded'
				},
				{
					eventId: 'pi_123:payment_intent.succeeded',
					type: 'payment_intent.succeeded'
				}
			])
		})
	})

	describe('handleAccountUpdated', () => {
		it('should update connected account status to active', async () => {
			const account = {
				id: 'acct_test123',
				details_submitted: true,
				charges_enabled: true,
				payouts_enabled: true
			} as Stripe.Account

			await service['handleAccountUpdated'](account)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				accountStatus: 'active',
				chargesEnabled: true,
				payoutsEnabled: true,
				updatedAt: expect.any(String)
			})
			expect(supabaseClient.eq).toHaveBeenCalledWith(
				'stripeAccountId',
				'acct_test123'
			)
		})

		it('should update connected account status to pending', async () => {
			const account = {
				id: 'acct_test123',
				details_submitted: true,
				charges_enabled: false,
				payouts_enabled: false
			} as Stripe.Account

			await service['handleAccountUpdated'](account)

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					accountStatus: 'pending',
					chargesEnabled: false,
					payoutsEnabled: false
				})
			)
		})

		it('should update connected account status to incomplete', async () => {
			const account = {
				id: 'acct_test123',
				details_submitted: false,
				charges_enabled: false,
				payouts_enabled: false
			} as Stripe.Account

			await service['handleAccountUpdated'](account)

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					accountStatus: 'incomplete'
				})
			)
		})
	})

	describe('handlePaymentSucceeded', () => {
		it('should update rent payment to succeeded', async () => {
			const paymentIntent = {
				id: 'pi_test123'
			} as Stripe.PaymentIntent

			await service['handlePaymentSucceeded'](paymentIntent)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'SUCCEEDED',
				paidAt: expect.any(String)
			})
			expect(supabaseClient.eq).toHaveBeenCalledWith(
				'stripePaymentIntentId',
				'pi_test123'
			)
		})
	})

	describe('handlePaymentFailed', () => {
		it('should update rent payment to failed with reason', async () => {
			const paymentIntent = {
				id: 'pi_test123',
				last_payment_error: {
					message: 'Insufficient funds'
				}
			} as Stripe.PaymentIntent

			await service['handlePaymentFailed'](paymentIntent)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason: 'Insufficient funds'
			})
		})

		it('should handle payment failure without error message', async () => {
			const paymentIntent = {
				id: 'pi_test123',
				last_payment_error: null
			} as unknown as Stripe.PaymentIntent

			await service['handlePaymentFailed'](paymentIntent)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason: 'Unknown error'
			})
		})
	})

	describe('handleInvoicePaymentSucceeded', () => {
		beforeEach(() => {
			// Mock subscription query
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123',
					tenantId: 'tenant123',
					landlordId: 'landlord123',
					leaseId: 'lease123'
				},
				error: null
			})
		})

		it.skip('should create rent payment record for successful subscription charge', async () => {
			// TODO: This test is skipped because the functionality is not yet implemented.
			// The handleInvoicePaymentSucceeded method needs rentDueId and organizationId
			// fields which don't exist in the current schema. See TODO comment in service.
			const invoice = {
				id: 'in_test123',
				subscription: 'sub_test123',
				payment_intent: 'pi_test123',
				amount_paid: 100000
			} as unknown as Stripe.Invoice

			await service['handleInvoicePaymentSucceeded'](invoice)

			expect(supabaseClient.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					tenantId: 'tenant123',
					landlordId: 'landlord123',
					leaseId: 'lease123',
					subscriptionId: 'subscription123',
					amount: 100000,
					platformFee: 2900, // 2.9% of 100000
					status: 'SUCCEEDED',
					paymentType: 'ach',
					stripeInvoiceId: 'in_test123'
				})
			)
		})

		it('should handle invoice without subscription', async () => {
			const invoice = {
				id: 'in_test123',
				subscription: null
			} as unknown as Stripe.Invoice

			// Should log warning and return early
			await service['handleInvoicePaymentSucceeded'](invoice)

			expect(supabaseClient.insert).not.toHaveBeenCalled()
		})
	})

	describe('handleInvoicePaymentFailed', () => {
		beforeEach(() => {
			// Mock subscription query
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'subscription123'
				},
				error: null
			})
		})

		it('should update subscription to past_due', async () => {
			const invoice = {
				id: 'in_test123',
				subscription: 'sub_test123',
				attempt_count: 1
			} as unknown as Stripe.Invoice

			await service['handleInvoicePaymentFailed'](invoice)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'past_due'
			})
		})

		it('should pause subscription after 4 failed attempts', async () => {
			const invoice = {
				id: 'in_test123',
				subscription: 'sub_test123',
				attempt_count: 4
			} as unknown as Stripe.Invoice

			await service['handleInvoicePaymentFailed'](invoice)

			// Should update twice - once for past_due, once for paused
			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'paused',
					pausedAt: expect.any(String)
				})
			)
		})
	})

	describe('handleSubscriptionUpdated', () => {
		it('should sync subscription status from Stripe', async () => {
			const subscription = {
				id: 'sub_test123',
				status: 'active'
			} as Stripe.Subscription

			await service['handleSubscriptionUpdated'](subscription)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'active',
				updatedAt: expect.any(String)
			})
		})

		it('should map past_due status correctly', async () => {
			const subscription = {
				id: 'sub_test123',
				status: 'past_due'
			} as Stripe.Subscription

			await service['handleSubscriptionUpdated'](subscription)

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'past_due'
				})
			)
		})

		it('should map unpaid status to past_due', async () => {
			const subscription = {
				id: 'sub_test123',
				status: 'unpaid'
			} as Stripe.Subscription

			await service['handleSubscriptionUpdated'](subscription)

			expect(supabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'past_due'
				})
			)
		})
	})

	describe('handleSubscriptionDeleted', () => {
		it('should update subscription to cancelled with canceledAt timestamp', async () => {
			const subscription = {
				id: 'sub_test123'
			} as Stripe.Subscription

			await service['handleSubscriptionDeleted'](subscription)

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'cancelled',
				canceledAt: expect.any(String),
				updatedAt: expect.any(String)
			})
			expect(supabaseClient.eq).toHaveBeenCalledWith(
				'stripeSubscriptionId',
				'sub_test123'
			)
		})
	})

	describe('handleDisputeCreated', () => {
		it('should route ACH disputes to handleACHDispute', async () => {
			const dispute = {
				id: 'dp_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			const handleACHDisputeSpy = jest
				.spyOn(service as any, 'handleACHDispute')
				.mockResolvedValue(undefined)

			await service['handleDisputeCreated'](dispute)

			expect(handleACHDisputeSpy).toHaveBeenCalledWith(dispute)
		})

		it('should route card disputes to handleCardDispute', async () => {
			const dispute = {
				id: 'dp_test123',
				reason: 'fraudulent',
				amount: 100000
			} as Stripe.Dispute

			const handleCardDisputeSpy = jest
				.spyOn(service as any, 'handleCardDispute')
				.mockResolvedValue(undefined)

			await service['handleDisputeCreated'](dispute)

			expect(handleCardDisputeSpy).toHaveBeenCalledWith(dispute)
		})

		it('should handle incorrect_account_details as ACH dispute', async () => {
			const dispute = {
				id: 'dp_test123',
				reason: 'incorrect_account_details',
				amount: 100000
			} as Stripe.Dispute

			const handleACHDisputeSpy = jest
				.spyOn(service as any, 'handleACHDispute')
				.mockResolvedValue(undefined)

			await service['handleDisputeCreated'](dispute)

			expect(handleACHDisputeSpy).toHaveBeenCalledWith(dispute)
		})

		it('should handle bank_cannot_process as ACH dispute', async () => {
			const dispute = {
				id: 'dp_test123',
				reason: 'bank_cannot_process',
				amount: 100000
			} as Stripe.Dispute

			const handleACHDisputeSpy = jest
				.spyOn(service as any, 'handleACHDispute')
				.mockResolvedValue(undefined)

			await service['handleDisputeCreated'](dispute)

			expect(handleACHDisputeSpy).toHaveBeenCalledWith(dispute)
		})
	})

	describe('handleACHDispute', () => {
		let mockStripe: any

		beforeEach(() => {
			mockStripe = {
				charges: {
					retrieve: jest.fn()
				},
				transfers: {
					createReversal: jest.fn()
				}
			}
			;(service as any).stripe = mockStripe
		})

		it('should reverse transfer and update payment for ACH dispute', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123',
				transfer: 'tr_test123'
			})

			mockStripe.transfers.createReversal.mockResolvedValue({
				id: 'trr_test123'
			})

			// Mock payment lookup
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'payment123',
					stripePaymentIntentId: 'pi_test123',
					tenantId: 'tenant123',
					landlordId: 'landlord123'
				},
				error: null
			})

			await service['handleACHDispute'](dispute)

			// Verify charge retrieval
			expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_test123')

			// Verify payment lookup
			expect(supabaseClient.select).toHaveBeenCalled()
			expect(supabaseClient.eq).toHaveBeenCalledWith(
				'stripePaymentIntentId',
				'pi_test123'
			)

			// Verify transfer reversal
			expect(mockStripe.transfers.createReversal).toHaveBeenCalledWith(
				'tr_test123',
				{
					amount: 100000,
					description: 'Dispute dp_test123: insufficient_funds',
					metadata: {
						dispute_id: 'dp_test123',
						payment_id: 'payment123',
						reason: 'insufficient_funds'
					}
				}
			)

			// Verify payment status update
			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason:
					'ACH Dispute (insufficient_funds): 1000 USD - Cannot appeal'
			})
		})

		it('should handle payment intent as expanded object', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: {
					id: 'pi_test123'
				},
				transfer: 'tr_test123'
			})

			mockStripe.transfers.createReversal.mockResolvedValue({
				id: 'trr_test123'
			})

			// Mock payment lookup
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'payment123',
					stripePaymentIntentId: 'pi_test123',
					tenantId: 'tenant123',
					landlordId: 'landlord123'
				},
				error: null
			})

			await service['handleACHDispute'](dispute)

			expect(supabaseClient.eq).toHaveBeenCalledWith(
				'stripePaymentIntentId',
				'pi_test123'
			)
		})

		it('should handle missing payment intent gracefully', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: null,
				transfer: 'tr_test123'
			})

			await service['handleACHDispute'](dispute)

			// Should return early without updating payment
			expect(supabaseClient.update).not.toHaveBeenCalled()
			expect(mockStripe.transfers.createReversal).not.toHaveBeenCalled()
		})

		it('should handle missing payment in database gracefully', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123',
				transfer: 'tr_test123'
			})

			// Override the beforeEach mock to return no payment
			supabaseClient.single.mockResolvedValueOnce({
				data: null,
				error: null
			})

			await service['handleACHDispute'](dispute)

			// Should return early without reversal
			expect(mockStripe.transfers.createReversal).not.toHaveBeenCalled()
			expect(supabaseClient.update).not.toHaveBeenCalled()
		})

		it('should update payment even if transfer reversal fails', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123',
				transfer: 'tr_test123'
			})

			// Simulate transfer reversal failure
			mockStripe.transfers.createReversal.mockRejectedValue(
				new Error('Reversal failed')
			)

			// Mock payment lookup
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'payment123',
					stripePaymentIntentId: 'pi_test123',
					tenantId: 'tenant123',
					landlordId: 'landlord123'
				},
				error: null
			})

			await service['handleACHDispute'](dispute)

			// Should still update payment status
			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason:
					'ACH Dispute (insufficient_funds): 1000 USD - Cannot appeal'
			})
		})

		it('should skip transfer reversal if no transfer exists', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'insufficient_funds',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123',
				transfer: null
			})

			// Mock payment lookup
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'payment123',
					stripePaymentIntentId: 'pi_test123',
					tenantId: 'tenant123',
					landlordId: 'landlord123'
				},
				error: null
			})

			await service['handleACHDispute'](dispute)

			// Should not attempt reversal
			expect(mockStripe.transfers.createReversal).not.toHaveBeenCalled()

			// But should still update payment
			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason:
					'ACH Dispute (insufficient_funds): 1000 USD - Cannot appeal'
			})
		})
	})

	describe('handleCardDispute', () => {
		let mockStripe: any

		beforeEach(() => {
			mockStripe = {
				charges: {
					retrieve: jest.fn()
				}
			}
			;(service as any).stripe = mockStripe
		})

		it('should update payment status for card dispute', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'fraudulent',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123'
			})

			// Mock payment lookup
			supabaseClient.single.mockResolvedValueOnce({
				data: {
					id: 'payment123',
					stripePaymentIntentId: 'pi_test123'
				},
				error: null
			})

			await service['handleCardDispute'](dispute)

			expect(mockStripe.charges.retrieve).toHaveBeenCalledWith('ch_test123')

			expect(supabaseClient.update).toHaveBeenCalledWith({
				status: 'FAILED',
				failureReason: 'Dispute (fraudulent): 1000 USD - Can submit evidence'
			})
		})

		it('should handle missing payment intent gracefully', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'fraudulent',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: null
			})

			await service['handleCardDispute'](dispute)

			expect(supabaseClient.update).not.toHaveBeenCalled()
		})

		it('should handle missing payment in database gracefully', async () => {
			const dispute = {
				id: 'dp_test123',
				charge: 'ch_test123',
				reason: 'fraudulent',
				amount: 100000
			} as Stripe.Dispute

			mockStripe.charges.retrieve.mockResolvedValue({
				id: 'ch_test123',
				payment_intent: 'pi_test123'
			})

			supabaseClient.single.mockResolvedValueOnce({
				data: null,
				error: null
			})

			await service['handleCardDispute'](dispute)

			expect(supabaseClient.update).not.toHaveBeenCalled()
		})
	})
})
