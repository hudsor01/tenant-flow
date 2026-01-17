import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { ConnectPayoutsService } from './connect-payouts.service'
import { StripeClientService } from '../../../shared/stripe-client.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('ConnectPayoutsService', () => {
	let service: ConnectPayoutsService
	let mockStripe: {
		balance: { retrieve: jest.Mock }
		payouts: { list: jest.Mock; retrieve: jest.Mock }
		transfers: { list: jest.Mock }
		accounts: { createLoginLink: jest.Mock }
	}
	let mockStripeClientService: { getClient: jest.Mock }

	const CONNECTED_ACCOUNT_ID = 'acct_connected123'

	beforeEach(async () => {
		mockStripe = {
			balance: {
				retrieve: jest.fn()
			},
			payouts: {
				list: jest.fn(),
				retrieve: jest.fn()
			},
			transfers: {
				list: jest.fn()
			},
			accounts: {
				createLoginLink: jest.fn()
			}
		}

		mockStripeClientService = {
			getClient: jest.fn().mockReturnValue(mockStripe)
		}

		const module = await Test.createTestingModule({
			providers: [
				ConnectPayoutsService,
				{ provide: StripeClientService, useValue: mockStripeClientService },
				{ provide: AppLogger, useValue: new SilentLogger() }
			]
		}).compile()

		service = module.get<ConnectPayoutsService>(ConnectPayoutsService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('getConnectedAccountBalance', () => {
		const mockBalance = {
			available: [{ amount: 500000, currency: 'usd' }],
			pending: [{ amount: 150000, currency: 'usd' }]
		} as Stripe.Balance

		it('retrieves balance with stripeAccount header', async () => {
			mockStripe.balance.retrieve.mockResolvedValue(mockBalance)

			const result =
				await service.getConnectedAccountBalance(CONNECTED_ACCOUNT_ID)

			expect(result).toEqual(mockBalance)
			expect(mockStripe.balance.retrieve).toHaveBeenCalledWith({
				stripeAccount: CONNECTED_ACCOUNT_ID
			})
		})

		it('returns balance object with available and pending amounts', async () => {
			mockStripe.balance.retrieve.mockResolvedValue(mockBalance)

			const result =
				await service.getConnectedAccountBalance(CONNECTED_ACCOUNT_ID)

			expect(result.available).toHaveLength(1)
			expect(result.available[0].amount).toBe(500000)
			expect(result.pending).toHaveLength(1)
			expect(result.pending[0].amount).toBe(150000)
		})
	})

	describe('listConnectedAccountPayouts', () => {
		const mockPayouts = {
			data: [
				{
					id: 'po_1',
					amount: 100000,
					status: 'paid',
					arrival_date: 1609459200
				},
				{ id: 'po_2', amount: 200000, status: 'pending', arrival_date: 1609545600 }
			] as Stripe.Payout[],
			has_more: true
		}

		it('lists payouts with stripeAccount header', async () => {
			mockStripe.payouts.list.mockResolvedValue(mockPayouts)

			const result = await service.listConnectedAccountPayouts(
				CONNECTED_ACCOUNT_ID
			)

			expect(result).toEqual(mockPayouts)
			expect(mockStripe.payouts.list).toHaveBeenCalledWith(
				{ limit: 10 },
				{ stripeAccount: CONNECTED_ACCOUNT_ID }
			)
		})

		it('uses default limit of 10', async () => {
			mockStripe.payouts.list.mockResolvedValue(mockPayouts)

			await service.listConnectedAccountPayouts(CONNECTED_ACCOUNT_ID)

			expect(mockStripe.payouts.list).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 10 }),
				expect.any(Object)
			)
		})

		it('supports custom limit', async () => {
			mockStripe.payouts.list.mockResolvedValue(mockPayouts)

			await service.listConnectedAccountPayouts(CONNECTED_ACCOUNT_ID, {
				limit: 25
			})

			expect(mockStripe.payouts.list).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 25 }),
				expect.any(Object)
			)
		})

		it('supports pagination with starting_after', async () => {
			mockStripe.payouts.list.mockResolvedValue(mockPayouts)

			await service.listConnectedAccountPayouts(CONNECTED_ACCOUNT_ID, {
				starting_after: 'po_cursor123'
			})

			expect(mockStripe.payouts.list).toHaveBeenCalledWith(
				expect.objectContaining({ starting_after: 'po_cursor123' }),
				expect.any(Object)
			)
		})
	})

	describe('getPayoutDetails', () => {
		const mockPayout = {
			id: 'po_test123',
			amount: 350000,
			status: 'paid',
			arrival_date: 1609459200,
			bank_account: {
				bank_name: 'Test Bank',
				last4: '1234'
			}
		} as unknown as Stripe.Payout

		it('retrieves payout by ID with stripeAccount header', async () => {
			mockStripe.payouts.retrieve.mockResolvedValue(mockPayout)

			const result = await service.getPayoutDetails(
				CONNECTED_ACCOUNT_ID,
				'po_test123'
			)

			expect(result).toEqual(mockPayout)
			expect(mockStripe.payouts.retrieve).toHaveBeenCalledWith('po_test123', {
				stripeAccount: CONNECTED_ACCOUNT_ID
			})
		})
	})

	describe('listTransfersToAccount', () => {
		const mockTransfers = {
			data: [
				{
					id: 'tr_1',
					amount: 145000,
					destination: CONNECTED_ACCOUNT_ID
				},
				{ id: 'tr_2', amount: 145000, destination: CONNECTED_ACCOUNT_ID }
			] as Stripe.Transfer[],
			has_more: false
		}

		it('lists transfers with destination filter', async () => {
			mockStripe.transfers.list.mockResolvedValue(mockTransfers)

			const result =
				await service.listTransfersToAccount(CONNECTED_ACCOUNT_ID)

			expect(result).toEqual(mockTransfers)
			expect(mockStripe.transfers.list).toHaveBeenCalledWith({
				destination: CONNECTED_ACCOUNT_ID,
				limit: 10
			})
		})

		it('uses default limit of 10', async () => {
			mockStripe.transfers.list.mockResolvedValue(mockTransfers)

			await service.listTransfersToAccount(CONNECTED_ACCOUNT_ID)

			expect(mockStripe.transfers.list).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 10 })
			)
		})

		it('supports custom limit', async () => {
			mockStripe.transfers.list.mockResolvedValue(mockTransfers)

			await service.listTransfersToAccount(CONNECTED_ACCOUNT_ID, { limit: 50 })

			expect(mockStripe.transfers.list).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 50 })
			)
		})

		it('supports pagination options', async () => {
			mockStripe.transfers.list.mockResolvedValue(mockTransfers)

			await service.listTransfersToAccount(CONNECTED_ACCOUNT_ID, {
				limit: 20,
				starting_after: 'tr_cursor456'
			})

			expect(mockStripe.transfers.list).toHaveBeenCalledWith({
				destination: CONNECTED_ACCOUNT_ID,
				limit: 20,
				starting_after: 'tr_cursor456'
			})
		})
	})

	describe('createDashboardLoginLink', () => {
		it('creates login link for connected account', async () => {
			mockStripe.accounts.createLoginLink.mockResolvedValue({
				url: 'https://connect.stripe.com/express/login/test123'
			})

			const result =
				await service.createDashboardLoginLink(CONNECTED_ACCOUNT_ID)

			expect(result).toBe('https://connect.stripe.com/express/login/test123')
			expect(mockStripe.accounts.createLoginLink).toHaveBeenCalledWith(
				CONNECTED_ACCOUNT_ID
			)
		})

		it('returns URL string', async () => {
			mockStripe.accounts.createLoginLink.mockResolvedValue({
				url: 'https://connect.stripe.com/express/login/xyz789'
			})

			const result =
				await service.createDashboardLoginLink(CONNECTED_ACCOUNT_ID)

			expect(typeof result).toBe('string')
			expect(result).toContain('https://')
		})

		it('propagates Stripe errors', async () => {
			const stripeError = new Error('Account not found')
			mockStripe.accounts.createLoginLink.mockRejectedValue(stripeError)

			await expect(
				service.createDashboardLoginLink('acct_invalid')
			).rejects.toThrow('Account not found')
		})
	})
})
