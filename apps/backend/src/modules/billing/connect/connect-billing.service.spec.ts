import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { ConnectBillingService } from './connect-billing.service'
import { StripeClientService } from '../../../shared/stripe-client.service'
import { StripeSharedService } from '../stripe-shared.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('ConnectBillingService', () => {
	let service: ConnectBillingService
	let mockStripe: {
		customers: { create: jest.Mock; del: jest.Mock }
		prices: { create: jest.Mock }
		subscriptions: { create: jest.Mock; cancel: jest.Mock }
	}
	let mockStripeClientService: { getClient: jest.Mock }
	let mockSharedService: { generateIdempotencyKey: jest.Mock }

	const CONNECTED_ACCOUNT_ID = 'acct_connected123'

	beforeEach(async () => {
		mockStripe = {
			customers: {
				create: jest.fn(),
				del: jest.fn()
			},
			prices: {
				create: jest.fn()
			},
			subscriptions: {
				create: jest.fn(),
				cancel: jest.fn()
			}
		}

		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		}

		mockSharedService = {
			generateIdempotencyKey: jest.fn().mockReturnValue('test-idempotency-key')
		}

		const module = await Test.createTestingModule({
			providers: [
				ConnectBillingService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: StripeSharedService, useValue: mockSharedService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<ConnectBillingService>(ConnectBillingService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('createCustomerOnConnectedAccount', () => {
		const mockCustomer = {
			id: 'cus_connected123',
			email: 'tenant@example.com',
			name: 'Test Tenant',
			metadata: { platform: 'tenantflow' }
		} as Stripe.Customer

		it('creates customer with stripeAccount header', async () => {
			mockStripe.customers.create.mockResolvedValue(mockCustomer)

			const result = await service.createCustomerOnConnectedAccount(
				CONNECTED_ACCOUNT_ID,
				{ email: 'tenant@example.com', name: 'Test Tenant' }
			)

			expect(result).toEqual(mockCustomer)
			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				{
					email: 'tenant@example.com',
					name: 'Test Tenant',
					metadata: { platform: 'tenantflow' }
				},
				{ stripeAccount: CONNECTED_ACCOUNT_ID }
			)
		})

		it('includes metadata with platform tag', async () => {
			mockStripe.customers.create.mockResolvedValue(mockCustomer)

			await service.createCustomerOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				email: 'tenant@example.com',
				metadata: { lease_id: 'lease-123' }
			})

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: { platform: 'tenantflow', lease_id: 'lease-123' }
				}),
				expect.any(Object)
			)
		})

		it('includes optional phone when provided', async () => {
			mockStripe.customers.create.mockResolvedValue(mockCustomer)

			await service.createCustomerOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				email: 'tenant@example.com',
				phone: '+1234567890'
			})

			expect(mockStripe.customers.create).toHaveBeenCalledWith(
				expect.objectContaining({
					email: 'tenant@example.com',
					phone: '+1234567890'
				}),
				expect.any(Object)
			)
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Invalid connected account')
			mockStripe.customers.create.mockRejectedValue(stripeError)

			await expect(
				service.createCustomerOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
					email: 'tenant@example.com'
				})
			).rejects.toThrow('Invalid connected account')
		})
	})

	describe('createSubscriptionOnConnectedAccount', () => {
		const mockPrice = {
			id: 'price_test123',
			unit_amount: 150000,
			currency: 'usd',
			recurring: { interval: 'month' }
		} as Stripe.Price

		const mockSubscription = {
			id: 'sub_test123',
			customer: 'cus_connected123',
			status: 'incomplete',
			items: { data: [{ price: mockPrice }] }
		} as unknown as Stripe.Subscription

		it('creates price first, then subscription', async () => {
			mockStripe.prices.create.mockResolvedValue(mockPrice)
			mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)

			const result = await service.createSubscriptionOnConnectedAccount(
				CONNECTED_ACCOUNT_ID,
				{
					customerId: 'cus_connected123',
					rentAmount: 150000
				}
			)

			expect(result).toEqual(mockSubscription)

			// Verify price creation
			expect(mockStripe.prices.create).toHaveBeenCalledWith(
				{
					currency: 'usd',
					unit_amount: 150000,
					recurring: { interval: 'month' },
					product_data: { name: 'Monthly Rent Payment' }
				},
				{ stripeAccount: CONNECTED_ACCOUNT_ID }
			)

			// Verify subscription creation with created price
			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
				{
					customer: 'cus_connected123',
					items: [{ price: 'price_test123' }],
					payment_behavior: 'default_incomplete',
					expand: ['latest_invoice.payment_intent'],
					metadata: { platform: 'tenantflow' }
				},
				{ stripeAccount: CONNECTED_ACCOUNT_ID }
			)
		})

		it('uses idempotency keys for both operations', async () => {
			mockStripe.prices.create.mockResolvedValue(mockPrice)
			mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)

			await service.createSubscriptionOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				customerId: 'cus_connected123',
				rentAmount: 150000,
				idempotencyKey: 'rent-setup-123'
			})

			expect(mockStripe.prices.create).toHaveBeenCalledWith(
				expect.any(Object),
				{
					stripeAccount: CONNECTED_ACCOUNT_ID,
					idempotencyKey: 'rent-setup-123-price'
				}
			)

			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
				expect.any(Object),
				{
					stripeAccount: CONNECTED_ACCOUNT_ID,
					idempotencyKey: 'rent-setup-123-subscription'
				}
			)
		})

		it('sets payment_behavior to default_incomplete', async () => {
			mockStripe.prices.create.mockResolvedValue(mockPrice)
			mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)

			await service.createSubscriptionOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				customerId: 'cus_connected123',
				rentAmount: 150000
			})

			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					payment_behavior: 'default_incomplete'
				}),
				expect.any(Object)
			)
		})

		it('uses custom currency when provided', async () => {
			mockStripe.prices.create.mockResolvedValue(mockPrice)
			mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)

			await service.createSubscriptionOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				customerId: 'cus_connected123',
				rentAmount: 150000,
				currency: 'eur'
			})

			expect(mockStripe.prices.create).toHaveBeenCalledWith(
				expect.objectContaining({
					currency: 'eur'
				}),
				expect.any(Object)
			)
		})

		it('includes custom metadata', async () => {
			mockStripe.prices.create.mockResolvedValue(mockPrice)
			mockStripe.subscriptions.create.mockResolvedValue(mockSubscription)

			await service.createSubscriptionOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
				customerId: 'cus_connected123',
				rentAmount: 150000,
				metadata: { lease_id: 'lease-456', tenant_id: 'tenant-789' }
			})

			expect(mockStripe.subscriptions.create).toHaveBeenCalledWith(
				expect.objectContaining({
					metadata: {
						platform: 'tenantflow',
						lease_id: 'lease-456',
						tenant_id: 'tenant-789'
					}
				}),
				expect.any(Object)
			)
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Invalid customer')
			mockStripe.prices.create.mockRejectedValue(stripeError)

			await expect(
				service.createSubscriptionOnConnectedAccount(CONNECTED_ACCOUNT_ID, {
					customerId: 'cus_invalid',
					rentAmount: 150000
				})
			).rejects.toThrow('Invalid customer')
		})
	})

	describe('deleteCustomer', () => {
		const mockDeletedCustomer = {
			id: 'cus_connected123',
			deleted: true
		} as Stripe.DeletedCustomer

		it('deletes customer with idempotency key', async () => {
			mockStripe.customers.del.mockResolvedValue(mockDeletedCustomer)

			const result = await service.deleteCustomer(
				'cus_connected123',
				CONNECTED_ACCOUNT_ID
			)

			expect(result).toEqual(mockDeletedCustomer)
			expect(mockSharedService.generateIdempotencyKey).toHaveBeenCalledWith(
				'cus_del_conn',
				CONNECTED_ACCOUNT_ID,
				'cus_connected123'
			)
		})

		it('uses stripeAccount header', async () => {
			mockStripe.customers.del.mockResolvedValue(mockDeletedCustomer)

			await service.deleteCustomer('cus_connected123', CONNECTED_ACCOUNT_ID)

			expect(mockStripe.customers.del).toHaveBeenCalledWith('cus_connected123', {
				stripeAccount: CONNECTED_ACCOUNT_ID,
				idempotencyKey: 'test-idempotency-key'
			})
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Customer not found')
			mockStripe.customers.del.mockRejectedValue(stripeError)

			await expect(
				service.deleteCustomer('cus_nonexistent', CONNECTED_ACCOUNT_ID)
			).rejects.toThrow('Customer not found')
		})
	})

	describe('cancelSubscription', () => {
		const mockCanceledSubscription = {
			id: 'sub_test123',
			status: 'canceled',
			canceled_at: 1609459200
		} as Stripe.Subscription

		it('cancels subscription with idempotency key', async () => {
			mockStripe.subscriptions.cancel.mockResolvedValue(mockCanceledSubscription)

			const result = await service.cancelSubscription(
				'sub_test123',
				CONNECTED_ACCOUNT_ID
			)

			expect(result).toEqual(mockCanceledSubscription)
			expect(mockSharedService.generateIdempotencyKey).toHaveBeenCalledWith(
				'sub_cancel_conn',
				CONNECTED_ACCOUNT_ID,
				'sub_test123'
			)
		})

		it('uses stripeAccount header', async () => {
			mockStripe.subscriptions.cancel.mockResolvedValue(mockCanceledSubscription)

			await service.cancelSubscription('sub_test123', CONNECTED_ACCOUNT_ID)

			expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(
				'sub_test123',
				{},
				{
					stripeAccount: CONNECTED_ACCOUNT_ID,
					idempotencyKey: 'test-idempotency-key'
				}
			)
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Subscription not found')
			mockStripe.subscriptions.cancel.mockRejectedValue(stripeError)

			await expect(
				service.cancelSubscription('sub_nonexistent', CONNECTED_ACCOUNT_ID)
			).rejects.toThrow('Subscription not found')
		})
	})
})
