import { Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { SupabaseService } from '../database/supabase.service'
import { StripeClientService } from '../shared/stripe-client.service'
import { StripeConnectService } from './stripe-connect.service'

describe('StripeConnectService', () => {
	let service: StripeConnectService

	let stripeAccountsCreate: jest.Mock
	let stripeAccountsRetrieve: jest.Mock
	let stripeAccountLinksCreate: jest.Mock
	let mockSupabaseClient: any

	const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
	const mockEmail = 'landlord@example.com'
	const mockStripeAccountId = 'acct_test123'

	beforeEach(async () => {
		// Mock Stripe methods
		stripeAccountsCreate = jest.fn()
		stripeAccountsRetrieve = jest.fn()
		stripeAccountLinksCreate = jest.fn()

		// Create a proper chain-able mock for Supabase
		const createMockChain = () => {
			const mockChain = {
				from: jest.fn().mockReturnThis(),
				insert: jest.fn().mockReturnThis(),
				update: jest.fn().mockReturnThis(),
				select: jest.fn().mockReturnThis(),
				eq: jest.fn().mockReturnThis(),
				single: jest.fn().mockReturnThis()
			}
			// Make all methods return the same chain
			mockChain.from.mockReturnValue(mockChain)
			mockChain.insert.mockReturnValue(mockChain)
			mockChain.update.mockReturnValue(mockChain)
			mockChain.select.mockReturnValue(mockChain)
			mockChain.eq.mockReturnValue(mockChain)
			mockChain.single.mockReturnValue(mockChain)
			return mockChain
		}

		mockSupabaseClient = createMockChain()

		const mockStripe = {
			accounts: {
				create: stripeAccountsCreate,
				retrieve: stripeAccountsRetrieve
			},
			accountLinks: {
				create: stripeAccountLinksCreate
			}
		}

		const mockStripeClientService = {
			getClient: jest.fn(() => mockStripe)
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StripeConnectService,
				{
					provide: SupabaseService,
					useValue: {
						getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
					}
				},
				{
					provide: StripeClientService,
					useValue: mockStripeClientService
				}
			]
		}).compile()

		service = module.get<StripeConnectService>(StripeConnectService)

		// Suppress logger output in tests
		jest.spyOn(Logger.prototype, 'log').mockImplementation()
		jest.spyOn(Logger.prototype, 'error').mockImplementation()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('createConnectedAccount', () => {
		const mockStripeAccount: Partial<Stripe.Account> = {
			id: mockStripeAccountId,
			type: 'express',
			charges_enabled: false,
			payouts_enabled: false,
			details_submitted: false,
			capabilities: {
				card_payments: 'active',
				transfers: 'active'
			}
		}

		const mockAccountLink = {
			url: 'https://connect.stripe.com/setup/test123'
		}

		it('should create a Stripe Connect account and store in database', async () => {
			stripeAccountsCreate.mockResolvedValue(mockStripeAccount)
			stripeAccountLinksCreate.mockResolvedValue(mockAccountLink)

			mockSupabaseClient.insert.mockReturnValue({ error: null })

			const result = await service.createConnectedAccount({
				userId: mockUserId,
				email: mockEmail,
				displayName: 'Test Landlord',
				country: 'US',
				entityType: 'individual'
			})

			expect(stripeAccountsCreate).toHaveBeenCalledWith({
				type: 'express',
				country: 'US',
				email: mockEmail,
				business_type: 'individual',
				business_profile: {
					name: 'Test Landlord'
				},
				capabilities: {
					card_payments: { requested: true },
					transfers: { requested: true }
				},
				metadata: {
					userId: mockUserId,
					platform: 'tenantflow'
				}
			})

			expect(mockSupabaseClient.from).toHaveBeenCalledWith('connected_account')
			expect(result).toEqual({
				accountId: mockStripeAccountId,
				onboardingUrl: mockAccountLink.url,
				status: 'pending'
			})
		})

		it('should use businessName if provided, otherwise displayName', async () => {
			stripeAccountsCreate.mockResolvedValue(mockStripeAccount)
			stripeAccountLinksCreate.mockResolvedValue(mockAccountLink)

			mockSupabaseClient.insert.mockReturnValue({ error: null })

			await service.createConnectedAccount({
				userId: mockUserId,
				email: mockEmail,
				displayName: 'John Doe',
				businessName: 'Doe Properties LLC'
			})

			expect(stripeAccountsCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					business_profile: {
						name: 'Doe Properties LLC'
					}
				})
			)
		})

		it('should throw error if database insert fails', async () => {
			stripeAccountsCreate.mockResolvedValue(mockStripeAccount)

			mockSupabaseClient.insert.mockReturnValue({
				error: { message: 'Database error' }
			})

			await expect(
				service.createConnectedAccount({
					userId: mockUserId,
					email: mockEmail,
					displayName: 'Test Landlord'
				})
			).rejects.toThrow('Failed to store connected account')
		})

		it('should throw error if Stripe account creation fails', async () => {
			stripeAccountsCreate.mockRejectedValue(new Error('Stripe API error'))

			await expect(
				service.createConnectedAccount({
					userId: mockUserId,
					email: mockEmail,
					displayName: 'Test Landlord'
				})
			).rejects.toThrow('Stripe API error')
		})
	})

	describe('getConnectedAccount', () => {
		it('should retrieve Stripe account by ID', async () => {
			const mockAccount: Partial<Stripe.Account> = {
				id: mockStripeAccountId,
				type: 'express',
				charges_enabled: true
			}

			stripeAccountsRetrieve.mockResolvedValue(mockAccount)

			const result = await service.getConnectedAccount(mockStripeAccountId)

			expect(stripeAccountsRetrieve).toHaveBeenCalledWith(mockStripeAccountId)
			expect(result).toEqual(mockAccount)
		})
	})

	describe('updateConnectedAccountFromWebhook', () => {
		const mockStripeAccount: Partial<Stripe.Account> = {
			id: mockStripeAccountId,
			charges_enabled: true,
			payouts_enabled: true,
			details_submitted: true,
			capabilities: { card_payments: 'active' } as any,
			requirements: { currently_due: [] } as any
		}

		it('should update account status when charges enabled', async () => {
			stripeAccountsRetrieve.mockResolvedValue(mockStripeAccount)

			mockSupabaseClient.eq.mockResolvedValue({ error: null })

			await service.updateConnectedAccountFromWebhook(mockStripeAccountId)

			expect(mockSupabaseClient.update).toHaveBeenCalledWith(
				expect.objectContaining({
					accountStatus: 'active',
					chargesEnabled: true,
					payoutsEnabled: true,
					detailsSubmitted: true,
					onboardingCompleted: true
				})
			)
		})

		it('should not mark onboarding complete if charges not enabled', async () => {
			stripeAccountsRetrieve.mockResolvedValue({
				...mockStripeAccount,
				charges_enabled: false
			})

			mockSupabaseClient.eq.mockResolvedValue({ error: null })

			await service.updateConnectedAccountFromWebhook(mockStripeAccountId)

			const updateCall = mockSupabaseClient.update.mock.calls[0][0]
			expect(updateCall.accountStatus).toBe('pending')
			expect(updateCall.onboardingCompleted).toBeUndefined()
		})

		it('should throw error if database update fails', async () => {
			const updateError = { message: 'Update failed' }
			stripeAccountsRetrieve.mockResolvedValue(mockStripeAccount)

			mockSupabaseClient.eq.mockResolvedValue({ error: updateError })

			await expect(
				service.updateConnectedAccountFromWebhook(mockStripeAccountId)
			).rejects.toEqual(updateError)
		})
	})

	describe('createAccountLink', () => {
		it('should create account onboarding link', async () => {
			const mockLink = {
				url: 'https://connect.stripe.com/setup/test123'
			}

			stripeAccountLinksCreate.mockResolvedValue(mockLink)

			const result = await service.createAccountLink(mockStripeAccountId)

			expect(stripeAccountLinksCreate).toHaveBeenCalledWith({
				account: mockStripeAccountId,
				refresh_url: `${process.env.FRONTEND_URL}/settings/connect/refresh`,
				return_url: `${process.env.FRONTEND_URL}/settings/connect/success`,
				type: 'account_onboarding'
			})
			expect(result).toBe(mockLink.url)
		})
	})

	describe('getUserConnectedAccount', () => {
		it('should return connected account for user', async () => {
			const mockAccount = {
				id: 'conn_123',
				userId: mockUserId,
				stripeAccountId: mockStripeAccountId,
				accountStatus: 'active'
			}

			mockSupabaseClient.single.mockResolvedValue({
				data: mockAccount,
				error: null
			})

			const result = await service.getUserConnectedAccount(mockUserId)

			expect(mockSupabaseClient.from).toHaveBeenCalledWith('connected_account')
			expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
			expect(mockSupabaseClient.eq).toHaveBeenCalledWith('userId', mockUserId)
			expect(result).toEqual(mockAccount)
		})

		it('should return null if no account found', async () => {
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})

			const result = await service.getUserConnectedAccount(mockUserId)

			expect(result).toBeNull()
		})

		it('should throw error for database errors other than not found', async () => {
			const dbError = { code: 'OTHER_ERROR', message: 'Database error' }
			mockSupabaseClient.single.mockResolvedValue({
				data: null,
				error: dbError
			})

			await expect(service.getUserConnectedAccount(mockUserId)).rejects.toEqual(
				dbError
			)
		})
	})
})
