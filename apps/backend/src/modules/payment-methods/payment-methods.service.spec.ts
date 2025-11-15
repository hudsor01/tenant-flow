import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../../database/supabase.service'
import { SupabaseQueryHelpers } from '../../shared/supabase/supabase-query-helpers'
import { StripeClientService } from '../../shared/stripe-client.service'
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
	const userClient: any = { from: jest.fn() }
	const adminClient: any = { from: jest.fn() }
	const mockSupabaseService = {
		getUserClient: jest.fn(() => userClient),
		getAdminClient: jest.fn(() => adminClient)
	}
	const mockStripe = {
		customers: { create: jest.fn(), update: jest.fn() },
		paymentMethods: {
			attach: jest.fn(),
			list: jest.fn(),
			detach: jest.fn(),
			retrieve: jest.fn()
		}
	}
	const mockStripeClientService = {
		getClient: jest.fn(() => mockStripe)
	}

	beforeEach(async () => {
		userClient.from.mockReset()
		adminClient.from.mockReset()

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				PaymentMethodsService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService
				},
				{
					provide: StripeClientService,
					useValue: mockStripeClientService
				},
				{
					provide: SupabaseQueryHelpers,
					useValue: {
						querySingle: jest.fn(),
						queryList: jest.fn(),
						querySingleWithVersion: jest.fn(),
						queryCount: jest.fn()
					}
				}
			]
		}).compile()

		service = module.get<PaymentMethodsService>(PaymentMethodsService)

		mockStripe.customers.create.mockResolvedValue({
			id: 'cus_new_123'
		} as Stripe.Response<Stripe.Customer>)
		mockStripe.customers.update.mockResolvedValue(
			{} as Stripe.Response<Stripe.Customer>
		)
		mockStripe.paymentMethods.retrieve.mockResolvedValue({
			id: 'pm_123',
			type: 'card',
			customer: 'cus_existing_123',
			card: {
				last4: '4242',
				brand: 'visa'
			}
		} as Stripe.Response<Stripe.PaymentMethod>)
		mockStripe.paymentMethods.detach.mockResolvedValue(
			{} as Stripe.Response<Stripe.PaymentMethod>
		)
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
			expect(service['stripe'].customers.create).toHaveBeenCalledWith(
				{ email: 'tenant@example.com', metadata: { userId: 'user-1' } },
				expect.objectContaining({ idempotencyKey: expect.any(String) })
			)
		})
	})

	describe('listPaymentMethods', () => {
		let resolveTenantIdSpy: jest.SpyInstance

		beforeEach(() => {
			resolveTenantIdSpy = jest
				.spyOn(service as any, 'resolveTenantId')
				.mockResolvedValue('tenant-123')
		})

		afterEach(() => {
			resolveTenantIdSpy?.mockRestore()
		})

		it('returns tenant payment methods', async () => {
			const builder: any = {
				select: jest.fn(() => builder),
				eq: jest.fn(() => builder),
				order: jest.fn(() =>
					Promise.resolve({
						data: [{ id: 'pm-1' }],
						error: null
					})
				)
			}

			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant_payment_method') {
					return builder
				}
				throw new Error(`Unexpected table ${table}`)
			})

			const result = await service.listPaymentMethods('token', 'user-1')

			expect(result).toEqual([{ id: 'pm-1' }])
			expect(builder.order).toHaveBeenCalledWith('createdAt', {
				ascending: false
			})
		})

		it('throws BadRequestException on database error', async () => {
			const builder: any = {
				select: jest.fn(() => builder),
				eq: jest.fn(() => builder),
				order: jest.fn(() =>
					Promise.resolve({
						data: null,
						error: { message: 'db-error' }
					})
				)
			}

			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant_payment_method') {
					return builder
				}
				throw new Error(`Unexpected table ${table}`)
			})

			await expect(
				service.listPaymentMethods('token', 'user-1')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('setDefaultPaymentMethod', () => {
		const buildTenantTable = (tenant: {
			id: string
			stripe_customer_id: string
		}) => ({
			select: jest.fn(() => ({
				eq: jest.fn(() => ({
					single: jest.fn(() =>
						Promise.resolve({
							data: tenant,
							error: null
						})
					)
				}))
			}))
		})

		it('updates Stripe default payment method when ownership matches', async () => {
			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant') {
					return buildTenantTable({
						id: 'tenant-1',
						stripe_customer_id: 'cus_existing_123'
					})
				}
				throw new Error(`Unexpected table ${table}`)
			})

			await service.setDefaultPaymentMethod('token', 'user-1', 'pm_123')

			expect(mockStripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_123')
			expect(mockStripe.customers.update).toHaveBeenCalledWith(
				'cus_existing_123',
				{
					invoice_settings: {
						default_payment_method: 'pm_123'
					}
				}
			)
		})

		it('throws when payment method belongs to another customer', async () => {
			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant') {
					return buildTenantTable({
						id: 'tenant-1',
						stripe_customer_id: 'cus_existing_123'
					})
				}
				throw new Error(`Unexpected table ${table}`)
			})

			mockStripe.paymentMethods.retrieve.mockResolvedValueOnce({
				id: 'pm_123',
				customer: 'cus_other'
			} as Stripe.Response<Stripe.PaymentMethod>)

			await expect(
				service.setDefaultPaymentMethod('token', 'user-1', 'pm_123')
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('deletePaymentMethod', () => {
		it('detaches, deletes, and promotes next default payment method', async () => {
			const tenantBuilder: any = {
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() =>
							Promise.resolve({
								data: { id: 'tenant-1' },
								error: null
							})
						)
					}))
				}))
			}

			const recordBuilder: any = {
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: jest.fn(() =>
								Promise.resolve({
									data: {
										stripePaymentMethodId: 'pm_123',
										isDefault: true
									},
									error: null
								})
							)
						}))
					}))
				}))
			}

			const deleteBuilder: any = {
				delete: jest.fn(() => ({
					eq: jest.fn(() => ({
						eq: jest.fn(() => Promise.resolve({ error: null }))
					}))
				}))
			}

			const listBuilder: any = {
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						order: jest.fn(() => ({
							limit: jest.fn(() =>
								Promise.resolve({
									data: [{ id: 'pm_next' }],
									error: null
								})
							)
						}))
					}))
				}))
			}

			const promoteBuilder: any = {
				update: jest.fn(() => ({
					eq: jest.fn(() => Promise.resolve({ error: null }))
				}))
			}

			let tenantPaymentMethodCall = 0

			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant') {
					return tenantBuilder
				}
				if (table === 'tenant_payment_method') {
					tenantPaymentMethodCall += 1
					switch (tenantPaymentMethodCall) {
						case 1:
							return recordBuilder
						case 2:
							return deleteBuilder
						case 3:
							return listBuilder
						case 4:
							return promoteBuilder
						default:
							throw new Error('Unexpected tenant_payment_method call')
					}
				}
				throw new Error(`Unexpected table ${table}`)
			})

			await service.deletePaymentMethod('token', 'user-1', 'pm-record')

			expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_123')
			expect(deleteBuilder.delete).toHaveBeenCalled()
			expect(listBuilder.select).toHaveBeenCalledWith('id')
			expect(promoteBuilder.update).toHaveBeenCalled()
		})

		it('throws NotFoundException when payment method is missing', async () => {
			const tenantBuilder: any = {
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						single: jest.fn(() =>
							Promise.resolve({
								data: { id: 'tenant-1' },
								error: null
							})
						)
					}))
				}))
			}

			const missingBuilder: any = {
				select: jest.fn(() => ({
					eq: jest.fn(() => ({
						eq: jest.fn(() => ({
							single: jest.fn(() =>
								Promise.resolve({
									data: null,
									error: { message: 'not found' }
								})
							)
						}))
					}))
				}))
			}

			userClient.from.mockImplementation((table: string) => {
				if (table === 'tenant') {
					return tenantBuilder
				}
				if (table === 'tenant_payment_method') {
					return missingBuilder
				}
				throw new Error(`Unexpected table ${table}`)
			})

			await expect(
				service.deletePaymentMethod('token', 'user-1', 'pm-record')
			).rejects.toThrow(NotFoundException)
		})
	})
})
