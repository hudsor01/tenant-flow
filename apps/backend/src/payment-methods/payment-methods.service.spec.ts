import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { PaymentMethodsService } from './payment-methods.service'

type SupabaseQueryResult<T> = Promise<{ data: T; error: null }>

const createSelectSingleMock = <T>(result: T): any => {
	const builder: any = {}
	builder.select = jest.fn(() => builder)
	builder.eq = jest.fn(() => builder)
	builder.single = jest.fn(
		() =>
			Promise.resolve({
				data: result,
				error: null
			}) as SupabaseQueryResult<T>
	)
	builder.update = jest.fn(() => ({
		eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
	}))
	return builder
}

describe('PaymentMethodsService', () => {
	let service: PaymentMethodsService
	const adminClient: any = { from: jest.fn() }
	const mockSupabaseService = {
		getAdminClient: jest.fn(() => adminClient)
	}

	beforeEach(async () => {
		adminClient.from.mockReset()

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

		jest.spyOn(service['stripe'].customers, 'create').mockResolvedValue({
			id: 'cus_new_123'
		} as Stripe.Response<Stripe.Customer>)

		jest.spyOn(service['stripe'].setupIntents, 'create').mockResolvedValue({
			id: 'seti_123',
			client_secret: 'secret_123'
		} as Stripe.Response<Stripe.SetupIntent>)

		jest.spyOn(service['stripe'].paymentMethods, 'retrieve').mockResolvedValue({
			id: 'pm_123',
			type: 'card',
			customer: 'cus_existing_123',
			card: {
				last4: '4242',
				brand: 'visa'
			}
		} as Stripe.Response<Stripe.PaymentMethod>)

		jest
			.spyOn(service['stripe'].paymentMethods, 'attach')
			.mockResolvedValue({} as Stripe.Response<Stripe.PaymentMethod>)

		jest
			.spyOn(service['stripe'].paymentMethods, 'detach')
			.mockResolvedValue({} as Stripe.Response<Stripe.PaymentMethod>)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getOrCreateStripeCustomer', () => {
		it('returns existing Stripe customer ID', async () => {
			adminClient.from.mockImplementation((table: string) => {
				if (table === 'users') {
					return createSelectSingleMock({
						stripeCustomerId: 'cus_existing_123',
						email: 'tenant@example.com'
					})
				}
				throw new Error(`Unexpected table ${table}`)
			})

			const result = await service.getOrCreateStripeCustomer(
				'user-1',
				'tenant@example.com'
			)

			expect(result).toBe('cus_existing_123')
			expect(service['stripe'].customers.create).not.toHaveBeenCalled()
		})

		it('creates new Stripe customer when missing', async () => {
			const selectBuilder = createSelectSingleMock({
				stripeCustomerId: null,
				email: 'tenant@example.com'
			})
			selectBuilder.update = jest.fn(() => ({
				eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
			}))

			adminClient.from.mockImplementation((table: string) => {
				if (table === 'users') {
					return selectBuilder
				}
				throw new Error(`Unexpected table ${table}`)
			})

			const result = await service.getOrCreateStripeCustomer(
				'user-1',
				'tenant@example.com'
			)

			expect(result).toBe('cus_new_123')
			expect(service['stripe'].customers.create).toHaveBeenCalledWith({
				email: 'tenant@example.com',
				metadata: { userId: 'user-1' }
			})
		})
	})

	describe('createSetupIntent', () => {
		it('creates a SetupIntent for the provided payment method type', async () => {
			adminClient.from.mockImplementation((table: string) => {
				if (table === 'users') {
					return createSelectSingleMock({
						stripeCustomerId: 'cus_existing_123',
						email: 'tenant@example.com'
					})
				}
				throw new Error(`Unexpected table ${table}`)
			})

			const result = await service.createSetupIntent(
				'user-1',
				'tenant@example.com',
				'us_bank_account'
			)

			expect(result).toEqual({
				clientSecret: 'secret_123',
				setupIntentId: 'seti_123'
			})

			expect(service['stripe'].setupIntents.create).toHaveBeenCalledWith({
				customer: 'cus_existing_123',
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
		it('persists a new payment method and marks default when first', async () => {
			const userBuilder = createSelectSingleMock({
				stripeCustomerId: 'cus_existing_123',
				email: 'tenant@example.com'
			})

			const duplicateCheckBuilder: any = {
				select: jest.fn(() => duplicateCheckBuilder),
				match: jest.fn(() => duplicateCheckBuilder),
				maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
			}

			const listExistingBuilder: any = {
				select: jest.fn(() => listExistingBuilder),
				eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
			}

			const updateBuilder: any = {
				update: jest.fn(() => ({
					eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
				}))
			}

			const insertBuilder: any = {
				insert: jest.fn(() => Promise.resolve({ error: null }))
			}

			let tenantPaymentMethodCall = 0

			adminClient.from.mockImplementation((table: string) => {
				if (table === 'users') {
					return userBuilder
				}

				if (table === 'tenant_payment_method') {
					tenantPaymentMethodCall += 1
					switch (tenantPaymentMethodCall) {
						case 1:
							return duplicateCheckBuilder
						case 2:
							return listExistingBuilder
						case 3:
							return updateBuilder
						case 4:
							return insertBuilder
						default:
							throw new Error('Unexpected tenant_payment_method call')
					}
				}
				throw new Error(`Unexpected table ${table}`)
			})

			const result = await service.savePaymentMethod('user-1', 'pm_123')

			expect(result).toEqual({ success: true })
			expect(insertBuilder.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					tenantId: 'user-1',
					stripePaymentMethodId: 'pm_123',
					isDefault: true
				})
			)
		})
	})
})
