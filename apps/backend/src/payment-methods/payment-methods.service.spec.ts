import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { PaymentMethodsService } from './payment-methods.service'

describe('PaymentMethodsService', () => {
	let service: PaymentMethodsService
	let supabaseService: SupabaseService

	const mockSupabaseClient = () => {
		const mock: any = {}

		// Create chainable mock methods
		mock.from = jest.fn().mockReturnValue(mock)
		mock.select = jest.fn().mockReturnValue(mock)
		mock.insert = jest.fn().mockReturnValue(mock)
		mock.update = jest.fn().mockReturnValue(mock)
		mock.delete = jest.fn().mockReturnValue(mock)
		mock.order = jest.fn().mockReturnValue(mock)

		// For terminal/chainable methods - default to returning mock but can be overridden
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
				PaymentMethodsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		service = module.get<PaymentMethodsService>(PaymentMethodsService)
		supabaseService = module.get<SupabaseService>(SupabaseService)

		// Mock Stripe SDK
		jest.spyOn(service['stripe'].customers, 'create').mockResolvedValue({
			id: 'cus_test123'
		} as Stripe.Response<Stripe.Customer>)

		jest.spyOn(service['stripe'].setupIntents, 'create').mockResolvedValue({
			id: 'seti_test123',
			client_secret: 'seti_test123_secret_test'
		} as Stripe.Response<Stripe.SetupIntent>)

		jest.spyOn(service['stripe'].paymentMethods, 'retrieve').mockResolvedValue({
			id: 'pm_test123',
			type: 'card',
			customer: 'cus_test123',
			card: {
				last4: '4242',
				brand: 'visa'
			}
		} as Stripe.Response<Stripe.PaymentMethod>)

		jest
			.spyOn(service['stripe'].paymentMethods, 'detach')
			.mockResolvedValue({} as Stripe.Response<Stripe.PaymentMethod>)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getOrCreateStripeCustomer', () => {
		it('should return existing Stripe customer ID if user has one', async () => {
			supabaseClient.single.mockResolvedValueOnce({
				data: { stripeCustomerId: 'cus_existing123' },
				error: null
			})

			const result = await service.getOrCreateStripeCustomer(
				'user123',
				'test@example.com'
			)

			expect(result).toBe('cus_existing123')
			expect(service['stripe'].customers.create).not.toHaveBeenCalled()
		})

		it('should create new Stripe customer if user does not have one', async () => {
			supabaseClient.single.mockResolvedValueOnce({
				data: { stripeCustomerId: null },
				error: null
			})

			const result = await service.getOrCreateStripeCustomer(
				'user123',
				'test@example.com'
			)

			expect(result).toBe('cus_test123')
			expect(service['stripe'].customers.create).toHaveBeenCalledWith({
				email: 'test@example.com',
				metadata: { userId: 'user123' }
			})
			expect(supabaseClient.update).toHaveBeenCalledWith({
				stripeCustomerId: 'cus_test123'
			})
		})
	})

	describe('createSetupIntent', () => {
		it('should create card SetupIntent', async () => {
			supabaseClient.single.mockResolvedValueOnce({
				data: { stripeCustomerId: 'cus_test123' },
				error: null
			})

			const result = await service.createSetupIntent(
				'user123',
				'test@example.com',
				'card'
			)

			expect(result).toEqual({
				clientSecret: 'seti_test123_secret_test',
				setupIntentId: 'seti_test123'
			})

			expect(service['stripe'].setupIntents.create).toHaveBeenCalledWith({
				customer: 'cus_test123',
				payment_method_types: ['card'],
				usage: 'off_session'
			})
		})

		it('should create ACH SetupIntent with instant verification', async () => {
			supabaseClient.single.mockResolvedValueOnce({
				data: { stripeCustomerId: 'cus_test123' },
				error: null
			})

			await service.createSetupIntent(
				'user123',
				'test@example.com',
				'us_bank_account'
			)

			expect(service['stripe'].setupIntents.create).toHaveBeenCalledWith({
				customer: 'cus_test123',
				payment_method_types: ['us_bank_account'],
				usage: 'off_session',
				payment_method_options: {
					us_bank_account: {
						verification_method: 'instant',
						financial_connections: {
							permissions: ['payment_method', 'balances']
						}
					}
				}
			})
		})
	})

	describe('savePaymentMethod', () => {
		it('should save payment method to database', async () => {
			supabaseClient.insert.mockResolvedValueOnce({
				error: null
			})

			const result = await service.savePaymentMethod('user123', 'pm_test123')

			expect(result).toEqual({ success: true })
			expect(service['stripe'].paymentMethods.retrieve).toHaveBeenCalledWith(
				'pm_test123'
			)
			expect(supabaseClient.insert).toHaveBeenCalledWith({
				tenantId: 'user123',
				stripePaymentMethodId: 'pm_test123',
				stripeCustomerId: 'cus_test123',
				type: 'card',
				last4: '4242',
				brand: 'visa',
				isDefault: true,
				verificationStatus: 'verified'
			})
		})

		it('should throw error if database insert fails', async () => {
			supabaseClient.insert.mockResolvedValueOnce({
				error: { message: 'Database error' }
			})

			await expect(
				service.savePaymentMethod('user123', 'pm_test123')
			).rejects.toThrow('Failed to save payment method')
		})
	})

	describe('listPaymentMethods', () => {
		it('should return list of payment methods for tenant', async () => {
			const mockPaymentMethods = [
				{
					id: 'pm1',
					tenantId: 'user123',
					type: 'card',
					last4: '4242',
					isDefault: true
				},
				{
					id: 'pm2',
					tenantId: 'user123',
					type: 'us_bank_account',
					last4: '6789',
					isDefault: false
				}
			]

			supabaseClient.order.mockResolvedValueOnce({
				data: mockPaymentMethods,
				error: null
			})

			const result = await service.listPaymentMethods('user123')

			expect(result).toEqual(mockPaymentMethods)
			expect(supabaseClient.select).toHaveBeenCalledWith('*')
			expect(supabaseClient.eq).toHaveBeenCalledWith('tenantId', 'user123')
			expect(supabaseClient.order).toHaveBeenCalledWith('createdAt', {
				ascending: false
			})
		})
	})

	describe('setDefaultPaymentMethod', () => {
		it('should set payment method as default', async () => {
			// First query: .update().eq() - first .eq() returns result
			// Second query: .update().eq().eq() - first .eq() returns mock, second .eq() returns result
			supabaseClient.eq
				.mockReturnValueOnce({ error: null }) // First query's .eq()
				.mockReturnValueOnce(supabaseClient) // Second query's first .eq() (returns mock for chaining)
				.mockReturnValueOnce({ error: null }) // Second query's second .eq()

			const result = await service.setDefaultPaymentMethod(
				'user123',
				'pm_test123'
			)

			expect(result).toEqual({ success: true })

			// Should unset all existing defaults first
			expect(supabaseClient.update).toHaveBeenCalledWith({
				isDefault: false
			})
			expect(supabaseClient.eq).toHaveBeenCalledWith('tenantId', 'user123')

			// Then set new default
			expect(supabaseClient.update).toHaveBeenCalledWith({
				isDefault: true
			})
		})
	})

	describe('deletePaymentMethod', () => {
		it('should delete payment method from Stripe and database', async () => {
			// First query: .select().eq().eq().single()
			// Second query: .delete().eq().eq()
			supabaseClient.eq
				.mockReturnValueOnce(supabaseClient) // First query's first .eq()
				.mockReturnValueOnce(supabaseClient) // First query's second .eq() (chain to .single())
				.mockReturnValueOnce(supabaseClient) // Second query's first .eq()
				.mockReturnValueOnce({ error: null }) // Second query's second .eq()

			supabaseClient.single.mockResolvedValueOnce({
				data: { stripePaymentMethodId: 'pm_test123' },
				error: null
			})

			const result = await service.deletePaymentMethod('user123', 'pm_test123')

			expect(result).toEqual({ success: true })
			expect(service['stripe'].paymentMethods.detach).toHaveBeenCalledWith(
				'pm_test123'
			)
			expect(supabaseClient.delete).toHaveBeenCalled()
		})

		it('should throw error if payment method not found', async () => {
			// Only first query: .select().eq().eq().single()
			supabaseClient.eq
				.mockReturnValueOnce(supabaseClient) // First .eq()
				.mockReturnValueOnce(supabaseClient) // Second .eq() (chain to .single())

			supabaseClient.single.mockResolvedValueOnce({
				data: null,
				error: null
			})

			await expect(
				service.deletePaymentMethod('user123', 'pm_test123')
			).rejects.toThrow('Payment method not found')
		})
	})
})
