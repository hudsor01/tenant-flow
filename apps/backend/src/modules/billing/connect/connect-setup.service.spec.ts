import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import type Stripe from 'stripe'
import { ConnectSetupService } from './connect-setup.service'
import { StripeClientService } from '../../../shared/stripe-client.service'
import { SupabaseService } from '../../../database/supabase.service'
import { AppConfigService } from '../../../config/app-config.service'
import { StripeSharedService } from '../stripe-shared.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('ConnectSetupService', () => {
	let service: ConnectSetupService
	let mockStripe: {
		accounts: { create: jest.Mock; retrieve: jest.Mock; del: jest.Mock }
		accountLinks: { create: jest.Mock }
	}
	let mockStripeClientService: { getClient: jest.Mock }
	let mockSupabaseService: { getAdminClient: jest.Mock }
	let mockAppConfigService: {
		getFrontendUrl: jest.Mock
		getStripeConnectDefaultCountry: jest.Mock
	}
	let mockSharedService: { generateIdempotencyKey: jest.Mock }

	// Mock query builders
	let selectMock: jest.Mock
	let eqMock: jest.Mock
	let singleMock: jest.Mock
	let updateMock: jest.Mock
	let updateEqMock: jest.Mock

	const TEST_USER_ID = 'user-123'
	const TEST_ACCOUNT_ID = 'acct_test123'
	const TEST_EMAIL = 'owner@example.com'

	beforeEach(async () => {
		mockStripe = {
			accounts: {
				create: jest.fn(),
				retrieve: jest.fn(),
				del: jest.fn()
			},
			accountLinks: {
				create: jest.fn()
			}
		}

		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		}

		// Setup Supabase query builder mocks
		selectMock = jest.fn().mockReturnThis()
		eqMock = jest.fn().mockReturnThis()
		singleMock = jest.fn()
		updateEqMock = jest.fn()
		updateMock = jest.fn().mockReturnValue({ eq: updateEqMock })

		const mockAdminClient = {
			from: jest.fn().mockReturnValue({
				select: selectMock,
				eq: eqMock,
				single: singleMock,
				update: updateMock
			})
		}

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockAdminClient)
		}

		mockAppConfigService = {
			getFrontendUrl: jest.fn().mockReturnValue('https://app.tenantflow.com'),
			getStripeConnectDefaultCountry: jest.fn().mockReturnValue('US')
		}

		mockSharedService = {
			generateIdempotencyKey: jest.fn().mockReturnValue('test-idempotency-key')
		}

		const module = await Test.createTestingModule({
			providers: [
				ConnectSetupService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: AppConfigService, useValue: mockAppConfigService },
				{ provide: StripeSharedService, useValue: mockSharedService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<ConnectSetupService>(ConnectSetupService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('getStripe', () => {
		it('returns Stripe instance', () => {
			const stripe = service.getStripe()

			expect(stripe).toBe(mockStripe)
		})
	})

	describe('createConnectedAccount', () => {
		const mockAccount = {
			id: TEST_ACCOUNT_ID,
			type: 'express',
			country: 'US',
			email: TEST_EMAIL
		} as Stripe.Account

		const mockAccountLink = {
			url: 'https://connect.stripe.com/setup/test123'
		} as Stripe.AccountLink

		it('returns existing account if user already has one', async () => {
			singleMock.mockResolvedValue({
				data: { stripe_account_id: 'acct_existing' },
				error: null
			})
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			const result = await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL
			})

			expect(result.accountId).toBe('acct_existing')
			expect(result.onboardingUrl).toBe(mockAccountLink.url)
			expect(mockStripe.accounts.create).not.toHaveBeenCalled()
		})

		it('creates new Express account with correct params', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue(mockAccount)
			updateEqMock.mockResolvedValue({ error: null })
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			const result = await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL,
				first_name: 'John',
				last_name: 'Doe'
			})

			expect(result.accountId).toBe(TEST_ACCOUNT_ID)
			expect(mockStripe.accounts.create).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'express',
					country: 'US',
					email: TEST_EMAIL,
					capabilities: {
						card_payments: { requested: true },
						transfers: { requested: true }
					},
					business_type: 'individual',
					metadata: expect.objectContaining({
						user_id: TEST_USER_ID,
						platform: 'tenantflow'
					})
				}),
				expect.objectContaining({
					idempotencyKey: `create_account_${TEST_USER_ID}`
				})
			)
		})

		it('uses idempotency key for creation', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue(mockAccount)
			updateEqMock.mockResolvedValue({ error: null })
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL
			})

			expect(mockStripe.accounts.create).toHaveBeenCalledWith(
				expect.any(Object),
				{ idempotencyKey: `create_account_${TEST_USER_ID}` }
			)
		})

		it('saves account to database', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue(mockAccount)
			updateEqMock.mockResolvedValue({ error: null })
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL
			})

			expect(updateMock).toHaveBeenCalledWith({
				stripe_account_id: TEST_ACCOUNT_ID,
				onboarding_status: 'pending'
			})
			expect(updateEqMock).toHaveBeenCalledWith('user_id', TEST_USER_ID)
		})

		it('cleans up Stripe account on database failure', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue(mockAccount)
			updateEqMock.mockResolvedValue({ error: { message: 'Database error' } })
			mockStripe.accounts.del.mockResolvedValue({ deleted: true })

			await expect(
				service.createConnectedAccount({
					user_id: TEST_USER_ID,
					email: TEST_EMAIL
				})
			).rejects.toThrow(BadRequestException)

			expect(mockStripe.accounts.del).toHaveBeenCalledWith(TEST_ACCOUNT_ID, {
				idempotencyKey: 'test-idempotency-key'
			})
		})

		it('handles invalid country codes (falls back to default)', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue(mockAccount)
			updateEqMock.mockResolvedValue({ error: null })
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL,
				country: 'INVALID'
			})

			expect(mockStripe.accounts.create).toHaveBeenCalledWith(
				expect.objectContaining({
					country: 'US' // default
				}),
				expect.any(Object)
			)
		})

		it('uses valid country code when provided', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			mockStripe.accounts.create.mockResolvedValue({
				...mockAccount,
				country: 'GB'
			})
			updateEqMock.mockResolvedValue({ error: null })
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			await service.createConnectedAccount({
				user_id: TEST_USER_ID,
				email: TEST_EMAIL,
				country: 'GB'
			})

			expect(mockStripe.accounts.create).toHaveBeenCalledWith(
				expect.objectContaining({
					country: 'GB'
				}),
				expect.any(Object)
			)
		})

		it('propagates Stripe errors', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST116' }
			})
			const stripeError = new Error('Stripe API error')
			mockStripe.accounts.create.mockRejectedValue(stripeError)

			await expect(
				service.createConnectedAccount({
					user_id: TEST_USER_ID,
					email: TEST_EMAIL
				})
			).rejects.toThrow('Stripe API error')
		})

		it('throws BadRequestException on fetch error', async () => {
			singleMock.mockResolvedValue({
				data: null,
				error: { code: 'PGRST500', message: 'Database connection error' }
			})

			await expect(
				service.createConnectedAccount({
					user_id: TEST_USER_ID,
					email: TEST_EMAIL
				})
			).rejects.toThrow(BadRequestException)
		})
	})

	describe('createAccountLink', () => {
		const mockAccountLink = {
			url: 'https://connect.stripe.com/setup/test123'
		} as Stripe.AccountLink

		it('creates account link with correct URLs', async () => {
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			const result = await service.createAccountLink(TEST_ACCOUNT_ID)

			expect(result).toEqual(mockAccountLink)
			expect(mockStripe.accountLinks.create).toHaveBeenCalledWith({
				account: TEST_ACCOUNT_ID,
				refresh_url: 'https://app.tenantflow.com/settings/billing?refresh=true',
				return_url: 'https://app.tenantflow.com/settings/billing?success=true',
				type: 'account_onboarding'
			})
		})

		it('strips trailing slashes from frontend URL', async () => {
			mockAppConfigService.getFrontendUrl.mockReturnValue(
				'https://app.tenantflow.com/'
			)
			mockStripe.accountLinks.create.mockResolvedValue(mockAccountLink)

			await service.createAccountLink(TEST_ACCOUNT_ID)

			expect(mockStripe.accountLinks.create).toHaveBeenCalledWith(
				expect.objectContaining({
					refresh_url: 'https://app.tenantflow.com/settings/billing?refresh=true'
				})
			)
		})

		it('validates FRONTEND_URL format', async () => {
			mockAppConfigService.getFrontendUrl.mockReturnValue('not-a-valid-url')

			await expect(service.createAccountLink(TEST_ACCOUNT_ID)).rejects.toThrow(
				/Invalid FRONTEND_URL format/
			)
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Account not found')
			mockStripe.accountLinks.create.mockRejectedValue(stripeError)

			await expect(service.createAccountLink(TEST_ACCOUNT_ID)).rejects.toThrow(
				'Account not found'
			)
		})
	})

	describe('getConnectedAccount', () => {
		const mockAccount = {
			id: TEST_ACCOUNT_ID,
			charges_enabled: true,
			payouts_enabled: true
		} as Stripe.Account

		it('returns account from Stripe', async () => {
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)

			const result = await service.getConnectedAccount(TEST_ACCOUNT_ID)

			expect(result).toEqual(mockAccount)
			expect(mockStripe.accounts.retrieve).toHaveBeenCalledWith(TEST_ACCOUNT_ID)
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Account not found')
			mockStripe.accounts.retrieve.mockRejectedValue(stripeError)

			await expect(
				service.getConnectedAccount('acct_invalid')
			).rejects.toThrow('Account not found')
		})
	})

	describe('updateOnboardingStatus', () => {
		const mockAccount = {
			id: TEST_ACCOUNT_ID,
			charges_enabled: true,
			payouts_enabled: true,
			requirements: { currently_due: [] }
		} as unknown as Stripe.Account

		it('updates database with onboarding status', async () => {
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
			singleMock.mockResolvedValue({
				data: { onboarding_completed_at: null },
				error: null
			})
			updateEqMock.mockResolvedValue({ error: null })

			await service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)

			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({
					stripe_account_id: TEST_ACCOUNT_ID,
					charges_enabled: true,
					payouts_enabled: true,
					onboarding_status: 'complete'
				})
			)
		})

		it('sets onboarding_completed_at when both charges_enabled and payouts_enabled', async () => {
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
			singleMock.mockResolvedValue({
				data: { onboarding_completed_at: null },
				error: null
			})
			updateEqMock.mockResolvedValue({ error: null })

			await service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)

			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({
					onboarding_completed_at: expect.any(String)
				})
			)
		})

		it('preserves existing onboarding_completed_at if already set', async () => {
			const existingTimestamp = '2026-01-15T10:00:00.000Z'
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
			singleMock.mockResolvedValue({
				data: { onboarding_completed_at: existingTimestamp },
				error: null
			})
			updateEqMock.mockResolvedValue({ error: null })

			await service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)

			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({
					onboarding_completed_at: existingTimestamp
				})
			)
		})

		it('sets status to in_progress when not fully enabled', async () => {
			const incompleteAccount = {
				...mockAccount,
				charges_enabled: true,
				payouts_enabled: false
			}
			mockStripe.accounts.retrieve.mockResolvedValue(incompleteAccount)
			singleMock.mockResolvedValue({
				data: { onboarding_completed_at: null },
				error: null
			})
			updateEqMock.mockResolvedValue({ error: null })

			await service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)

			expect(updateMock).toHaveBeenCalledWith(
				expect.objectContaining({
					onboarding_status: 'in_progress'
				})
			)
		})

		it('handles database errors', async () => {
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
			singleMock.mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			})

			await expect(
				service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)
			).rejects.toEqual({ message: 'Database error' })
		})

		it('handles update errors', async () => {
			mockStripe.accounts.retrieve.mockResolvedValue(mockAccount)
			singleMock.mockResolvedValue({
				data: { onboarding_completed_at: null },
				error: null
			})
			updateEqMock.mockResolvedValue({ error: { message: 'Update failed' } })

			await expect(
				service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)
			).rejects.toEqual({ message: 'Update failed' })
		})
	})
})
