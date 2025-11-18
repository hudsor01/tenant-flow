import { NotFoundException } from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeTenantService } from './stripe-tenant.service'
import type { StripeClientService } from '../../shared/stripe-client.service'
import type { SupabaseService } from '../../database/supabase.service'

const createMockStripe = (): jest.Mocked<Stripe> => {
	const mockStripe = {
		customers: {
			create: jest.fn(),
			retrieve: jest.fn()
		}
	} as unknown as jest.Mocked<Stripe>

	// Properly mock the customers.create method to return a Promise
	;(mockStripe.customers.create as jest.MockedFunction<any>).mockResolvedValue({
		id: 'cus_new'
	} as Stripe.Customer)

	return mockStripe
}

describe('StripeTenantService.ensureStripeCustomer', () => {
	let service: StripeTenantService
	let mockStripe: jest.Mocked<Stripe>
	let mockStripeClientService: jest.Mocked<StripeClientService>
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let tenantSingle: jest.Mock
	let tenantSelect: jest.Mock
	let tenantEq: jest.Mock
	let tenantUpdate: jest.Mock
	let tenantUpdateEq: jest.Mock

	beforeEach(() => {
		mockStripe = createMockStripe()

		mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		tenantSelect = jest.fn().mockReturnThis()
		tenantEq = jest.fn().mockReturnThis()
		tenantSingle = jest.fn()
		tenantUpdateEq = jest.fn().mockResolvedValue({ error: null })
		tenantUpdate = jest.fn().mockReturnValue({
			eq: tenantUpdateEq
		})

		const mockAdminClient = {
			from: jest.fn(() => ({
				select: tenantSelect,
				eq: tenantEq,
				single: tenantSingle,
				update: tenantUpdate
			}))
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		service = new StripeTenantService(
			mockStripeClientService,
			mockSupabaseService
		)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	it('creates a customer when tenant exists without Stripe ID', async () => {
		tenantSingle
			.mockResolvedValueOnce({
				data: { stripe_customer_id: null },
				error: null
			})
			.mockResolvedValueOnce({
				data: {
					id: 'tenant-1',
					email: 'tenant@example.com',
					first_name: 'Test',
					last_name: 'Tenant',
					name: null,
					stripe_customer_id: null,
					user_id: 'user-1'
				},
				error: null
			})
			.mockResolvedValueOnce({
				data: { stripe_customer_id: null },
				error: null
			})

		const result = await service.ensureStripeCustomer({
			tenant_id: 'tenant-1',
			metadata: { tenant_id: 'tenant-1', created_from: 'unit-test' }
		})

		expect(result.status).toBe('created')
		expect(result.customer.id).toBe('cus_new')
		expect(mockStripe.customers.create).toHaveBeenCalledWith(
			expect.objectContaining({
				metadata: expect.objectContaining({
					tenant_id: 'tenant-1',
					created_from: 'unit-test'
				})
			})
		)
		expect(tenantUpdate).toHaveBeenCalled()
		expect(tenantUpdateEq).toHaveBeenCalledWith('id', 'tenant-1')
	})

	it('throws NotFoundException when tenant record is missing', async () => {
		tenantSingle
			.mockResolvedValueOnce({
				data: { stripe_customer_id: null },
				error: null
			})
			.mockResolvedValueOnce({
				data: null,
				error: { message: 'not found' }
			})

		await expect(
			service.ensureStripeCustomer({
				tenant_id: 'missing-tenant'
			})
		).rejects.toBeInstanceOf(NotFoundException)

		expect(mockStripe.customers.create).not.toHaveBeenCalled()
	})
})
