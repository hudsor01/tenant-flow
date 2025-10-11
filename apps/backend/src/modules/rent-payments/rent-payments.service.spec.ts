import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { RentPaymentsService } from './rent-payments.service'

const createSingleQueryMock = <T>(data: T): any => {
	const builder: any = {}
	builder.select = jest.fn(() => builder)
	builder.eq = jest.fn(() => builder)
	builder.single = jest.fn(() => Promise.resolve({ data, error: null }))
	return builder
}

describe('RentPaymentsService', () => {
	let service: RentPaymentsService
	const adminClient: any = { from: jest.fn() }
	const mockSupabaseService = {
		getAdminClient: jest.fn(() => adminClient)
	}

	beforeEach(async () => {
		adminClient.from.mockReset()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				RentPaymentsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				}
			]
		}).compile()

		service = module.get<RentPaymentsService>(RentPaymentsService)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('fee calculations', () => {
		it('calculates platform fees per tier', () => {
			expect(service.calculatePlatformFee(100000, 'STARTER')).toBe(3000)
			expect(service.calculatePlatformFee(100000, 'GROWTH')).toBe(2500)
			expect(service.calculatePlatformFee(100000, 'TENANTFLOW_MAX')).toBe(2000)
			expect(service.calculatePlatformFee(100000, 'UNKNOWN')).toBe(3000)
		})

		it('calculates Stripe fees', () => {
			expect(service.calculateStripeFee(100000, 'card')).toBe(2930)
			expect(service.calculateStripeFee(100000, 'ach')).toBe(500)
		})

		it('aggregates fees with landlord net amount', () => {
			expect(service.calculateFees(100000, 'card', 'STARTER')).toEqual({
				platformFee: 3000,
				stripeFee: 2930,
				landlordReceives: 94070,
				total: 100000
			})
		})
	})

	describe('createOneTimePayment', () => {
		const tenant = {
			id: 'tenant123',
			userId: 'user123',
			email: 'tenant@example.com',
			firstName: 'Test',
			lastName: 'Tenant'
		}

		const tenantUser = {
			id: 'user123',
			stripeCustomerId: 'cus_existing',
			firstName: 'Test',
			lastName: 'Tenant',
			email: 'tenant@example.com'
		}

		const lease = {
			id: 'lease123',
			tenantId: 'tenant123',
			rentAmount: 1500,
			unitId: 'unit123'
		}

		const unit = { propertyId: 'property123' }
		const property = { ownerId: 'landlord123' }
		const landlord = {
			id: 'landlord123',
			stripeAccountId: 'acct_456',
			subscriptionTier: 'STARTER'
		}

		const tenantPaymentMethod = {
			stripePaymentMethodId: 'pm_123',
			stripeCustomerId: 'cus_existing',
			type: 'card'
		}

		const rentPaymentRecord = {
			id: 'payment123',
			tenantId: 'user123',
			landlordId: 'landlord123',
			leaseId: 'lease123',
			amount: 150000,
			platformFee: 4500,
			stripeFee: 4380,
			landlordReceives: 141120,
			status: 'succeeded',
			paymentType: 'card',
			stripePaymentIntentId: 'pi_123',
			createdAt: '2024-01-01T00:00:00Z',
			paidAt: '2024-01-01T00:00:00Z'
		}

		beforeEach(() => {
			const paymentIntent = {
				id: 'pi_123',
				status: 'succeeded',
				amount: 150000,
				latest_charge: {
					id: 'ch_123',
					receipt_url: 'https://stripe.com/receipt'
				}
			} as unknown as Stripe.Response<Stripe.PaymentIntent>

			jest
				.spyOn(service['stripe'].paymentIntents, 'create')
				.mockResolvedValue(paymentIntent)
		})

		it('creates destination charge and persists rent payment', async () => {
			const userCallResults = [tenantUser, landlord]
			let tenantPaymentMethodCall = 0

			const tenantPaymentMethodBuilders = [
				createSingleQueryMock(tenantPaymentMethod),
				{
					select: jest.fn(() => ({
						match: jest.fn(() => ({
							maybeSingle: jest.fn(() =>
								Promise.resolve({ data: null, error: null })
							)
						}))
					}))
				},
				{
					select: jest.fn(() => ({
						eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
					}))
				},
				{
					update: jest.fn(() => ({
						eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
					}))
				},
				{
					insert: jest.fn(() => Promise.resolve({ error: null }))
				}
			]

			const rentPaymentInsertBuilder = {
				insert: jest.fn(() => ({
					select: jest.fn(() => ({
						single: jest.fn(() =>
							Promise.resolve({ data: rentPaymentRecord, error: null })
						)
					}))
				}))
			}

			adminClient.from.mockImplementation((table: string) => {
				switch (table) {
					case 'tenant':
						return createSingleQueryMock(tenant)
					case 'users':
						return createSingleQueryMock(userCallResults.shift())
					case 'lease':
						return createSingleQueryMock(lease)
					case 'unit':
						return createSingleQueryMock(unit)
					case 'property':
						return createSingleQueryMock(property)
					case 'tenant_payment_method':
						return tenantPaymentMethodBuilders[tenantPaymentMethodCall++]
					case 'rent_payment':
						return rentPaymentInsertBuilder
					default:
						throw new Error(`Unexpected table ${table}`)
				}
			})

			const result = await service.createOneTimePayment(
				{
					tenantId: 'tenant123',
					leaseId: 'lease123',
					amount: 1500,
					paymentMethodId: 'pm_record'
				},
				'user123'
			)

			expect(result.payment.id).toBe('payment123')
			expect(service['stripe'].paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 150000,
					application_fee_amount: 4500,
					transfer_data: { destination: 'acct_456' }
				})
			)
		})
	})
})
