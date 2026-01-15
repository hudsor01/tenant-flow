/**
 * Stripe Customer Service Tests
 *
 * Unit tests for StripeCustomerService covering:
 * - listCustomers: returns customers, filters by email, filters out deleted
 * - getAllCustomers: pagination works correctly, aggregates all pages
 * - getCustomer: retrieves by ID, returns null for deleted, returns null on error
 * - createCustomer: creates with params, uses idempotency key when provided
 */

import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { StripeCustomerService } from './stripe-customer.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

const createMockStripe = (): jest.Mocked<Stripe> => {
	return {
		customers: {
			list: jest.fn(),
			retrieve: jest.fn(),
			create: jest.fn()
		}
	} as unknown as jest.Mocked<Stripe>
}

const createMockCustomer = (
	id: string,
	overrides: Partial<Stripe.Customer> = {}
): Stripe.Customer =>
	({
		id,
		object: 'customer' as const,
		email: `${id}@test.com`,
		name: `Test Customer ${id}`,
		subscriptions: { data: [] },
		...overrides
	}) as Stripe.Customer

const createDeletedCustomer = (id: string): Stripe.DeletedCustomer => ({
	id,
	object: 'customer',
	deleted: true
})

describe('StripeCustomerService', () => {
	let service: StripeCustomerService
	let mockStripe: jest.Mocked<Stripe>
	let mockStripeClientService: jest.Mocked<StripeClientService>

	beforeEach(async () => {
		mockStripe = createMockStripe()

		mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		const module = await Test.createTestingModule({
			providers: [
				StripeCustomerService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<StripeCustomerService>(StripeCustomerService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('listCustomers', () => {
		it('should return customers from Stripe API', async () => {
			const mockCustomers = [
				createMockCustomer('cus_1'),
				createMockCustomer('cus_2')
			]

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: mockCustomers,
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			const result = await service.listCustomers()

			expect(result).toEqual(mockCustomers)
			expect(mockStripe.customers.list).toHaveBeenCalledWith({
				limit: 10,
				expand: ['data.subscriptions']
			})
		})

		it('should filter by email when provided', async () => {
			const mockCustomer = createMockCustomer('cus_email', {
				email: 'specific@test.com'
			})

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: [mockCustomer],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			const result = await service.listCustomers({ email: 'specific@test.com' })

			expect(result).toEqual([mockCustomer])
			expect(mockStripe.customers.list).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'specific@test.com'
				})
			)
		})

		it('should use custom limit when provided', async () => {
			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			await service.listCustomers({ limit: 50 })

			expect(mockStripe.customers.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 50
				})
			)
		})

		it('should filter out deleted customers', async () => {
			const activeCustomer = createMockCustomer('cus_active')
			const deletedCustomer = createDeletedCustomer('cus_deleted')

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: [
					activeCustomer,
					deletedCustomer as unknown as Stripe.Customer
				],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			const result = await service.listCustomers()

			expect(result).toHaveLength(1)
			expect(result[0]?.id).toBe('cus_active')
		})

		it('should throw error on Stripe API failure', async () => {
			const stripeError = new Error('Stripe API error')

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockRejectedValue(stripeError)

			await expect(service.listCustomers()).rejects.toThrow('Stripe API error')
		})
	})

	describe('getAllCustomers', () => {
		it('should return all customers with pagination', async () => {
			const page1 = [createMockCustomer('cus_1'), createMockCustomer('cus_2')]
			const page2 = [createMockCustomer('cus_3')]

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			)
				.mockResolvedValueOnce({
					data: page1,
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)
				.mockResolvedValueOnce({
					data: page2,
					has_more: false,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)

			const result = await service.getAllCustomers()

			expect(result).toHaveLength(3)
			expect(result[0]?.id).toBe('cus_1')
			expect(result[2]?.id).toBe('cus_3')
			expect(mockStripe.customers.list).toHaveBeenCalledTimes(2)
		})

		it('should use starting_after for pagination', async () => {
			const page1 = [createMockCustomer('cus_1')]

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			)
				.mockResolvedValueOnce({
					data: page1,
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)
				.mockResolvedValueOnce({
					data: [],
					has_more: false,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)

			await service.getAllCustomers()

			expect(mockStripe.customers.list).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					starting_after: 'cus_1'
				})
			)
		})

		it('should filter by email when provided', async () => {
			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			await service.getAllCustomers({ email: 'filter@test.com' })

			expect(mockStripe.customers.list).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'filter@test.com'
				})
			)
		})

		it('should filter out deleted customers across all pages', async () => {
			const page1 = [
				createMockCustomer('cus_active_1'),
				createDeletedCustomer('cus_deleted_1') as unknown as Stripe.Customer
			]
			const page2 = [
				createDeletedCustomer('cus_deleted_2') as unknown as Stripe.Customer,
				createMockCustomer('cus_active_2')
			]

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			)
				.mockResolvedValueOnce({
					data: page1,
					has_more: true,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)
				.mockResolvedValueOnce({
					data: page2,
					has_more: false,
					object: 'list'
				} as Stripe.ApiList<Stripe.Customer>)

			const result = await service.getAllCustomers()

			expect(result).toHaveLength(2)
			expect(result.map(c => c.id)).toEqual(['cus_active_1', 'cus_active_2'])
		})

		it('should use default limit of 100 for pagination', async () => {
			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockResolvedValue({
				data: [],
				has_more: false,
				object: 'list'
			} as Stripe.ApiList<Stripe.Customer>)

			await service.getAllCustomers()

			expect(mockStripe.customers.list).toHaveBeenCalledWith(
				expect.objectContaining({
					limit: 100
				})
			)
		})

		it('should throw error on Stripe API failure', async () => {
			const stripeError = new Error('Stripe pagination error')

			;(
				mockStripe.customers.list as jest.MockedFunction<
					Stripe['customers']['list']
				>
			).mockRejectedValue(stripeError)

			await expect(service.getAllCustomers()).rejects.toThrow(
				'Stripe pagination error'
			)
		})
	})

	describe('getCustomer', () => {
		it('should retrieve customer by ID', async () => {
			const mockCustomer = createMockCustomer('cus_retrieve')

			;(
				mockStripe.customers.retrieve as jest.MockedFunction<
					Stripe['customers']['retrieve']
				>
			).mockResolvedValue(mockCustomer)

			const result = await service.getCustomer('cus_retrieve')

			expect(result).toEqual(mockCustomer)
			expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(
				'cus_retrieve',
				{ expand: ['subscriptions'] }
			)
		})

		it('should return null for deleted customer', async () => {
			const deletedCustomer = createDeletedCustomer('cus_deleted')

			;(
				mockStripe.customers.retrieve as jest.MockedFunction<
					Stripe['customers']['retrieve']
				>
			).mockResolvedValue(deletedCustomer)

			const result = await service.getCustomer('cus_deleted')

			expect(result).toBeNull()
		})

		it('should return null on Stripe API error', async () => {
			const stripeError = new Error('Customer not found')

			;(
				mockStripe.customers.retrieve as jest.MockedFunction<
					Stripe['customers']['retrieve']
				>
			).mockRejectedValue(stripeError)

			const result = await service.getCustomer('cus_invalid')

			expect(result).toBeNull()
		})

		it('should expand subscriptions when retrieving', async () => {
			const mockCustomer = createMockCustomer('cus_expanded')

			;(
				mockStripe.customers.retrieve as jest.MockedFunction<
					Stripe['customers']['retrieve']
				>
			).mockResolvedValue(mockCustomer)

			await service.getCustomer('cus_expanded')

			expect(mockStripe.customers.retrieve).toHaveBeenCalledWith(
				'cus_expanded',
				expect.objectContaining({
					expand: ['subscriptions']
				})
			)
		})
	})

	describe('createCustomer', () => {
		it('should create customer with provided params', async () => {
			const mockCustomer = createMockCustomer('cus_new', {
				email: 'new@customer.com',
				name: 'New Customer'
			})

			;(
				mockStripe.customers.create as jest.MockedFunction<
					Stripe['customers']['create']
				>
			).mockResolvedValue(mockCustomer)

			const params: Stripe.CustomerCreateParams = {
				email: 'new@customer.com',
				name: 'New Customer'
			}

			const result = await service.createCustomer(params)

			expect(result).toEqual(mockCustomer)
			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				params,
				undefined
			)
		})

		it('should use idempotency key when provided', async () => {
			const mockCustomer = createMockCustomer('cus_idempotent')

			;(
				mockStripe.customers.create as jest.MockedFunction<
					Stripe['customers']['create']
				>
			).mockResolvedValue(mockCustomer)

			const params: Stripe.CustomerCreateParams = {
				email: 'idempotent@test.com'
			}

			await service.createCustomer(params, 'idem_key_123')

			expect(mockStripe.customers.create).toHaveBeenCalledWith(params, {
				idempotencyKey: 'idem_key_123'
			})
		})

		it('should create customer with metadata', async () => {
			const mockCustomer = createMockCustomer('cus_metadata')

			;(
				mockStripe.customers.create as jest.MockedFunction<
					Stripe['customers']['create']
				>
			).mockResolvedValue(mockCustomer)

			const params: Stripe.CustomerCreateParams = {
				email: 'meta@test.com',
				metadata: {
					tenant_id: 'tenant_123',
					source: 'tenantflow'
				}
			}

			await service.createCustomer(params)

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: {
						tenant_id: 'tenant_123',
						source: 'tenantflow'
					}
				}),
				undefined
			)
		})

		it('should throw error on creation failure', async () => {
			const createError = new Error('Invalid email address')

			;(
				mockStripe.customers.create as jest.MockedFunction<
					Stripe['customers']['create']
				>
			).mockRejectedValue(createError)

			const params: Stripe.CustomerCreateParams = {
				email: 'invalid-email'
			}

			await expect(service.createCustomer(params)).rejects.toThrow(
				'Invalid email address'
			)
		})

		it('should create customer without idempotency key when not provided', async () => {
			const mockCustomer = createMockCustomer('cus_no_idem')

			;(
				mockStripe.customers.create as jest.MockedFunction<
					Stripe['customers']['create']
				>
			).mockResolvedValue(mockCustomer)

			const params: Stripe.CustomerCreateParams = {
				email: 'no-idem@test.com'
			}

			await service.createCustomer(params)

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				params,
				undefined
			)
		})
	})
})
