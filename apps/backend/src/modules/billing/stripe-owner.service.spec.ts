import { Test } from '@nestjs/testing'
import {
	NotFoundException,
	BadRequestException,
	ForbiddenException
} from '@nestjs/common'
import type Stripe from 'stripe'
import { StripeOwnerService } from './stripe-owner.service'
import { StripeClientService } from '../../shared/stripe-client.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__tests__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'
import { StripeSharedService } from './stripe-shared.service'

const createMockStripe = (): jest.Mocked<Stripe> => {
	const mockStripe = {
		customers: {
			create: jest.fn(),
			retrieve: jest.fn(),
			del: jest.fn()
		},
		paymentIntents: {
			create: jest.fn()
		}
	} as unknown as jest.Mocked<Stripe>

	return mockStripe
}

describe('StripeOwnerService', () => {
	let service: StripeOwnerService
	let mockStripe: jest.Mocked<Stripe>
	let mockSupabaseService: jest.Mocked<SupabaseService>
	let mockSharedService: jest.Mocked<StripeSharedService>
	let userSingle: jest.Mock
	let userUpdate: jest.Mock
	let userUpdateEq: jest.Mock

	beforeEach(async () => {
		mockStripe = createMockStripe()

		const mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		} as unknown as jest.Mocked<StripeClientService>

		userSingle = jest.fn()
		userUpdateEq = jest.fn().mockResolvedValue({ error: null })
		userUpdate = jest.fn().mockReturnValue({ eq: userUpdateEq })

		const mockAdminClient = {
			from: jest.fn((table: string) => {
				if (table === 'users') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						single: userSingle,
						update: userUpdate
					}
				}
				if (table === 'leases') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						single: jest.fn()
					}
				}
				return {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest.fn()
				}
			}),
			rpc: jest.fn()
		}

		mockSupabaseService = {
			getAdminClient: jest.fn(() => mockAdminClient)
		} as unknown as jest.Mocked<SupabaseService>

		mockSharedService = {
			generateIdempotencyKey: jest
				.fn()
				.mockReturnValue('test-idempotency-key')
		} as unknown as jest.Mocked<StripeSharedService>

		const module = await Test.createTestingModule({
			providers: [
				StripeOwnerService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppLogger, useValue: new SilentLogger() },
				{ provide: StripeSharedService, useValue: mockSharedService }
			]
		}).compile()

		service = module.get<StripeOwnerService>(StripeOwnerService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('ensureOwnerCustomer', () => {
		const mockOwner = {
			id: 'user-123',
			email: 'owner@example.com',
			first_name: 'Test',
			last_name: 'Owner',
			full_name: 'Test Owner',
			user_type: 'OWNER',
			stripe_customer_id: null,
			updated_at: '2024-01-01T00:00:00Z'
		}

		it('returns existing customer when owner has stripe_customer_id', async () => {
			const ownerWithStripe = {
				...mockOwner,
				stripe_customer_id: 'cus_existing'
			}
			userSingle.mockResolvedValue({ data: ownerWithStripe, error: null })
			;(
				mockStripe.customers.retrieve as jest.Mock
			).mockResolvedValue({
				id: 'cus_existing',
				email: 'owner@example.com'
			} as Stripe.Customer)

			const result = await service.ensureOwnerCustomer({
				user_id: 'user-123'
			})

			expect(result.status).toBe('existing')
			expect(result.customer.id).toBe('cus_existing')
			expect(mockStripe.customers.create).not.toHaveBeenCalled()
		})

		it('creates new customer when owner has no stripe_customer_id', async () => {
			userSingle.mockResolvedValue({ data: mockOwner, error: null })
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_new',
				email: 'owner@example.com'
			} as Stripe.Customer)

			const result = await service.ensureOwnerCustomer({
				user_id: 'user-123'
			})

			expect(result.status).toBe('created')
			expect(result.customer.id).toBe('cus_new')
			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'owner@example.com',
					name: 'Test Owner',
					metadata: expect.objectContaining({
						customer_type: 'property_owner',
						user_id: 'user-123',
						user_type: 'OWNER',
						platform: 'tenantflow'
					})
				}),
				expect.objectContaining({
					idempotencyKey: expect.any(String)
				})
			)
		})

		it('updates database with new customer ID', async () => {
			userSingle.mockResolvedValue({ data: mockOwner, error: null })
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_new'
			} as Stripe.Customer)

			await service.ensureOwnerCustomer({ user_id: 'user-123' })

			expect(userUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_customer_id: 'cus_new'
				})
			)
			expect(userUpdateEq).toHaveBeenCalledWith('id', 'user-123')
		})

		it('throws ForbiddenException for non-owner user', async () => {
			const tenantUser = { ...mockOwner, user_type: 'TENANT' }
			userSingle.mockResolvedValue({ data: tenantUser, error: null })

			await expect(
				service.ensureOwnerCustomer({ user_id: 'user-123' })
			).rejects.toThrow(ForbiddenException)

			expect(mockStripe.customers.create).not.toHaveBeenCalled()
		})

		it('throws NotFoundException when owner not found', async () => {
			userSingle.mockResolvedValue({
				data: null,
				error: { message: 'not found' }
			})

			await expect(
				service.ensureOwnerCustomer({ user_id: 'missing-user' })
			).rejects.toThrow(NotFoundException)
		})

		it('throws BadRequestException when email is missing', async () => {
			const ownerNoEmail = { ...mockOwner, email: null }
			userSingle.mockResolvedValue({ data: ownerNoEmail, error: null })

			await expect(
				service.ensureOwnerCustomer({ user_id: 'user-123' })
			).rejects.toThrow(BadRequestException)
		})

		it('recreates customer when existing customer was deleted', async () => {
			const ownerWithStripe = {
				...mockOwner,
				stripe_customer_id: 'cus_deleted'
			}
			userSingle.mockResolvedValue({ data: ownerWithStripe, error: null })
			;(mockStripe.customers.retrieve as jest.Mock).mockResolvedValue({
				id: 'cus_deleted',
				deleted: true
			})
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_recreated'
			} as Stripe.Customer)

			const result = await service.ensureOwnerCustomer({
				user_id: 'user-123'
			})

			expect(result.status).toBe('created')
			expect(result.customer.id).toBe('cus_recreated')
		})

		it('cleans up orphaned customer on database failure', async () => {
			userSingle.mockResolvedValue({ data: mockOwner, error: null })
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_orphan'
			} as Stripe.Customer)

			userUpdateEq.mockResolvedValue({
				error: { message: 'Database error' }
			})

			await expect(
				service.ensureOwnerCustomer({ user_id: 'user-123' })
			).rejects.toThrow('Failed to update user with Stripe customer ID')

			expect(mockSharedService.generateIdempotencyKey).toHaveBeenCalledWith(
				'cus_del_orphan',
				'user-123',
				'cus_orphan'
			)
			expect(mockStripe.customers.del).toHaveBeenCalledWith(
				'cus_orphan',
				{ idempotencyKey: 'test-idempotency-key' }
			)
		})

		it('uses provided email and name over database values', async () => {
			userSingle.mockResolvedValue({ data: mockOwner, error: null })
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_new'
			} as Stripe.Customer)

			await service.ensureOwnerCustomer({
				user_id: 'user-123',
				email: 'custom@example.com',
				name: 'Custom Name'
			})

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'custom@example.com',
					name: 'Custom Name'
				}),
				expect.any(Object)
			)
		})

		it('includes additional metadata when provided', async () => {
			userSingle.mockResolvedValue({ data: mockOwner, error: null })
			;(mockStripe.customers.create as jest.Mock).mockResolvedValue({
				id: 'cus_new'
			} as Stripe.Customer)

			await service.ensureOwnerCustomer({
				user_id: 'user-123',
				additionalMetadata: { source: 'api', campaign: 'signup' }
			})

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						source: 'api',
						campaign: 'signup'
					})
				}),
				expect.any(Object)
			)
		})
	})

	describe('createRentPaymentIntent', () => {
		const mockLease = {
			id: 'lease-123',
			rent_amount: 150000, // $1500 in cents
			rent_currency: 'usd',
			primary_tenant_id: 'tenant-456',
			owner_user_id: 'owner-789',
			stripe_connected_accounts: {
				stripe_account_id: 'acct_connected',
				default_platform_fee_percent: 1.0,
				charges_enabled: true
			}
		}

		let leaseSingle: jest.Mock

		beforeEach(() => {
			leaseSingle = jest.fn()
			const adminClient = mockSupabaseService.getAdminClient()
			;(adminClient.from as jest.Mock).mockImplementation((table: string) => {
				if (table === 'leases') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						single: leaseSingle
					}
				}
				if (table === 'users') {
					return {
						select: jest.fn().mockReturnThis(),
						eq: jest.fn().mockReturnThis(),
						single: userSingle,
						update: userUpdate
					}
				}
				return {
					select: jest.fn().mockReturnThis(),
					eq: jest.fn().mockReturnThis(),
					single: jest.fn()
				}
			})
			;(adminClient.rpc as jest.Mock).mockResolvedValue({
				data: [{ id: 'payment-id', was_inserted: true }],
				error: null
			})
		})

		it('creates payment intent with destination charges', async () => {
			leaseSingle.mockResolvedValue({ data: mockLease, error: null })
			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
				id: 'pi_123',
				status: 'succeeded',
				amount: 150000,
				payment_method_types: ['card']
			} as Stripe.PaymentIntent)

			const result = await service.createRentPaymentIntent({
				leaseId: 'lease-123',
				paymentMethodId: 'pm_card',
				tenantStripeCustomerId: 'cus_tenant'
			})

			expect(result.id).toBe('pi_123')
			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					amount: 150000,
					currency: 'usd',
					payment_method: 'pm_card',
					customer: 'cus_tenant',
					application_fee_amount: 1500, // 1% of $1500
					transfer_data: {
						destination: 'acct_connected'
					},
					on_behalf_of: 'acct_connected',
					confirm: true
				})
			)
		})

		it('calculates application fee correctly', async () => {
			const leaseWithFee = {
				...mockLease,
				stripe_connected_accounts: {
					...mockLease.stripe_connected_accounts,
					default_platform_fee_percent: 2.5 // 2.5% fee
				}
			}
			leaseSingle.mockResolvedValue({ data: leaseWithFee, error: null })
			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
				id: 'pi_123',
				status: 'succeeded'
			} as Stripe.PaymentIntent)

			await service.createRentPaymentIntent({
				leaseId: 'lease-123',
				paymentMethodId: 'pm_card',
				tenantStripeCustomerId: 'cus_tenant'
			})

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					application_fee_amount: 3750 // 2.5% of $1500 = $37.50
				})
			)
		})

		it('includes proper metadata', async () => {
			leaseSingle.mockResolvedValue({ data: mockLease, error: null })
			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
				id: 'pi_123',
				status: 'succeeded'
			} as Stripe.PaymentIntent)

			await service.createRentPaymentIntent({
				leaseId: 'lease-123',
				paymentMethodId: 'pm_card',
				tenantStripeCustomerId: 'cus_tenant'
			})

			expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: expect.objectContaining({
						lease_id: 'lease-123',
						tenant_id: 'tenant-456',
						owner_user_id: 'owner-789',
						platform: 'tenantflow'
					})
				})
			)
		})

		it('throws NotFoundException when lease not found', async () => {
			leaseSingle.mockResolvedValue({
				data: null,
				error: { message: 'not found' }
			})

			await expect(
				service.createRentPaymentIntent({
					leaseId: 'missing-lease',
					paymentMethodId: 'pm_card',
					tenantStripeCustomerId: 'cus_tenant'
				})
			).rejects.toThrow(NotFoundException)
		})

		it('throws BadRequestException when connected account is missing', async () => {
			const leaseNoAccount = {
				...mockLease,
				stripe_connected_accounts: {
					...mockLease.stripe_connected_accounts,
					stripe_account_id: null
				}
			}
			leaseSingle.mockResolvedValue({ data: leaseNoAccount, error: null })

			await expect(
				service.createRentPaymentIntent({
					leaseId: 'lease-123',
					paymentMethodId: 'pm_card',
					tenantStripeCustomerId: 'cus_tenant'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('throws BadRequestException when charges not enabled', async () => {
			const leaseNoCharges = {
				...mockLease,
				stripe_connected_accounts: {
					...mockLease.stripe_connected_accounts,
					charges_enabled: false
				}
			}
			leaseSingle.mockResolvedValue({ data: leaseNoCharges, error: null })

			await expect(
				service.createRentPaymentIntent({
					leaseId: 'lease-123',
					paymentMethodId: 'pm_card',
					tenantStripeCustomerId: 'cus_tenant'
				})
			).rejects.toThrow(BadRequestException)
		})

		it('records rent payment in database via RPC', async () => {
			leaseSingle.mockResolvedValue({ data: mockLease, error: null })
			;(mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue({
				id: 'pi_123',
				status: 'succeeded',
				payment_method_types: ['card']
			} as Stripe.PaymentIntent)

			const adminClient = mockSupabaseService.getAdminClient()

			await service.createRentPaymentIntent({
				leaseId: 'lease-123',
				paymentMethodId: 'pm_card',
				tenantStripeCustomerId: 'cus_tenant'
			})

			expect(adminClient.rpc).toHaveBeenCalledWith(
				'upsert_rent_payment',
				expect.objectContaining({
					p_lease_id: 'lease-123',
					p_tenant_id: 'tenant-456',
					p_amount: 150000,
					p_currency: 'usd',
					p_status: 'succeeded',
					p_stripe_payment_intent_id: 'pi_123',
					p_application_fee_amount: 1500
				})
			)
		})
	})
})
