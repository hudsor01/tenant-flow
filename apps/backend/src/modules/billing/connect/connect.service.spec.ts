import { Test } from '@nestjs/testing'
import type Stripe from 'stripe'
import { ConnectService } from './connect.service'
import { ConnectSetupService } from './connect-setup.service'
import { ConnectBillingService } from './connect-billing.service'
import { ConnectPayoutsService } from './connect-payouts.service'

describe('ConnectService (Facade)', () => {
	let service: ConnectService
	let mockSetupService: jest.Mocked<ConnectSetupService>
	let mockBillingService: jest.Mocked<ConnectBillingService>
	let mockPayoutsService: jest.Mocked<ConnectPayoutsService>

	const TEST_ACCOUNT_ID = 'acct_test123'
	const TEST_USER_ID = 'user-123'

	beforeEach(async () => {
		mockSetupService = {
			getStripe: jest.fn(),
			createConnectedAccount: jest.fn(),
			createAccountLink: jest.fn(),
			getConnectedAccount: jest.fn(),
			updateOnboardingStatus: jest.fn()
		} as unknown as jest.Mocked<ConnectSetupService>

		mockBillingService = {
			createCustomerOnConnectedAccount: jest.fn(),
			createSubscriptionOnConnectedAccount: jest.fn(),
			deleteCustomer: jest.fn(),
			cancelSubscription: jest.fn()
		} as unknown as jest.Mocked<ConnectBillingService>

		mockPayoutsService = {
			getConnectedAccountBalance: jest.fn(),
			listConnectedAccountPayouts: jest.fn(),
			getPayoutDetails: jest.fn(),
			listTransfersToAccount: jest.fn(),
			createDashboardLoginLink: jest.fn()
		} as unknown as jest.Mocked<ConnectPayoutsService>

		const module = await Test.createTestingModule({
			providers: [
				ConnectService,
				{ provide: ConnectSetupService, useValue: mockSetupService },
				{ provide: ConnectBillingService, useValue: mockBillingService },
				{ provide: ConnectPayoutsService, useValue: mockPayoutsService }
			]
		}).compile()

		service = module.get<ConnectService>(ConnectService)
	})

	afterEach(() => {
		jest.resetAllMocks()
	})

	describe('Setup Service Delegation', () => {
		it('getStripe delegates to ConnectSetupService', () => {
			const mockStripe = {} as Stripe
			mockSetupService.getStripe.mockReturnValue(mockStripe)

			const result = service.getStripe()

			expect(result).toBe(mockStripe)
			expect(mockSetupService.getStripe).toHaveBeenCalled()
		})

		it('createConnectedAccount delegates to ConnectSetupService', async () => {
			const params = {
				user_id: TEST_USER_ID,
				email: 'test@example.com',
				first_name: 'John'
			}
			const mockResult = {
				accountId: TEST_ACCOUNT_ID,
				onboardingUrl: 'https://connect.stripe.com/setup'
			}
			mockSetupService.createConnectedAccount.mockResolvedValue(mockResult)

			const result = await service.createConnectedAccount(params)

			expect(result).toEqual(mockResult)
			expect(mockSetupService.createConnectedAccount).toHaveBeenCalledWith(
				params
			)
		})

		it('createAccountLink delegates to ConnectSetupService', async () => {
			const mockAccountLink = {
				url: 'https://connect.stripe.com/setup'
			} as Stripe.AccountLink
			mockSetupService.createAccountLink.mockResolvedValue(mockAccountLink)

			const result = await service.createAccountLink(TEST_ACCOUNT_ID)

			expect(result).toEqual(mockAccountLink)
			expect(mockSetupService.createAccountLink).toHaveBeenCalledWith(
				TEST_ACCOUNT_ID
			)
		})

		it('getConnectedAccount delegates to ConnectSetupService', async () => {
			const mockAccount = { id: TEST_ACCOUNT_ID } as Stripe.Account
			mockSetupService.getConnectedAccount.mockResolvedValue(mockAccount)

			const result = await service.getConnectedAccount(TEST_ACCOUNT_ID)

			expect(result).toEqual(mockAccount)
			expect(mockSetupService.getConnectedAccount).toHaveBeenCalledWith(
				TEST_ACCOUNT_ID
			)
		})

		it('updateOnboardingStatus delegates to ConnectSetupService', async () => {
			mockSetupService.updateOnboardingStatus.mockResolvedValue(undefined)

			await service.updateOnboardingStatus(TEST_USER_ID, TEST_ACCOUNT_ID)

			expect(mockSetupService.updateOnboardingStatus).toHaveBeenCalledWith(
				TEST_USER_ID,
				TEST_ACCOUNT_ID
			)
		})
	})

	describe('Billing Service Delegation', () => {
		it('createCustomerOnConnectedAccount delegates to ConnectBillingService', async () => {
			const params = { email: 'tenant@example.com', name: 'Test Tenant' }
			const mockCustomer = { id: 'cus_test' } as Stripe.Customer
			mockBillingService.createCustomerOnConnectedAccount.mockResolvedValue(
				mockCustomer
			)

			const result = await service.createCustomerOnConnectedAccount(
				TEST_ACCOUNT_ID,
				params
			)

			expect(result).toEqual(mockCustomer)
			expect(
				mockBillingService.createCustomerOnConnectedAccount
			).toHaveBeenCalledWith(TEST_ACCOUNT_ID, params)
		})

		it('createSubscriptionOnConnectedAccount delegates to ConnectBillingService', async () => {
			const params = { customerId: 'cus_test', rentAmount: 150000 }
			const mockSubscription = { id: 'sub_test' } as Stripe.Subscription
			mockBillingService.createSubscriptionOnConnectedAccount.mockResolvedValue(
				mockSubscription
			)

			const result = await service.createSubscriptionOnConnectedAccount(
				TEST_ACCOUNT_ID,
				params
			)

			expect(result).toEqual(mockSubscription)
			expect(
				mockBillingService.createSubscriptionOnConnectedAccount
			).toHaveBeenCalledWith(TEST_ACCOUNT_ID, params)
		})

		it('deleteCustomer delegates to ConnectBillingService', async () => {
			const mockDeleted = {
				id: 'cus_test',
				deleted: true
			} as Stripe.DeletedCustomer
			mockBillingService.deleteCustomer.mockResolvedValue(mockDeleted)

			const result = await service.deleteCustomer('cus_test', TEST_ACCOUNT_ID)

			expect(result).toEqual(mockDeleted)
			expect(mockBillingService.deleteCustomer).toHaveBeenCalledWith(
				'cus_test',
				TEST_ACCOUNT_ID
			)
		})

		it('cancelSubscription delegates to ConnectBillingService', async () => {
			const mockCanceled = {
				id: 'sub_test',
				status: 'canceled'
			} as Stripe.Subscription
			mockBillingService.cancelSubscription.mockResolvedValue(mockCanceled)

			const result = await service.cancelSubscription(
				'sub_test',
				TEST_ACCOUNT_ID
			)

			expect(result).toEqual(mockCanceled)
			expect(mockBillingService.cancelSubscription).toHaveBeenCalledWith(
				'sub_test',
				TEST_ACCOUNT_ID
			)
		})
	})

	describe('Payouts Service Delegation', () => {
		it('getConnectedAccountBalance delegates to ConnectPayoutsService', async () => {
			const mockBalance = {
				available: [{ amount: 100000, currency: 'usd' }]
			} as Stripe.Balance
			mockPayoutsService.getConnectedAccountBalance.mockResolvedValue(
				mockBalance
			)

			const result = await service.getConnectedAccountBalance(TEST_ACCOUNT_ID)

			expect(result).toEqual(mockBalance)
			expect(
				mockPayoutsService.getConnectedAccountBalance
			).toHaveBeenCalledWith(TEST_ACCOUNT_ID)
		})

		it('listConnectedAccountPayouts delegates to ConnectPayoutsService', async () => {
			const mockPayouts = {
				data: [{ id: 'po_test' }],
				has_more: false
			} as Stripe.ApiList<Stripe.Payout>
			mockPayoutsService.listConnectedAccountPayouts.mockResolvedValue(
				mockPayouts
			)
			const options = { limit: 25 }

			const result = await service.listConnectedAccountPayouts(
				TEST_ACCOUNT_ID,
				options
			)

			expect(result).toEqual(mockPayouts)
			expect(
				mockPayoutsService.listConnectedAccountPayouts
			).toHaveBeenCalledWith(TEST_ACCOUNT_ID, options)
		})

		it('getPayoutDetails delegates to ConnectPayoutsService', async () => {
			const mockPayout = { id: 'po_test', amount: 50000 } as Stripe.Payout
			mockPayoutsService.getPayoutDetails.mockResolvedValue(mockPayout)

			const result = await service.getPayoutDetails(
				TEST_ACCOUNT_ID,
				'po_test'
			)

			expect(result).toEqual(mockPayout)
			expect(mockPayoutsService.getPayoutDetails).toHaveBeenCalledWith(
				TEST_ACCOUNT_ID,
				'po_test'
			)
		})

		it('listTransfersToAccount delegates to ConnectPayoutsService', async () => {
			const mockTransfers = {
				data: [{ id: 'tr_test' }],
				has_more: false
			} as Stripe.ApiList<Stripe.Transfer>
			mockPayoutsService.listTransfersToAccount.mockResolvedValue(mockTransfers)
			const options = { limit: 10, starting_after: 'tr_cursor' }

			const result = await service.listTransfersToAccount(
				TEST_ACCOUNT_ID,
				options
			)

			expect(result).toEqual(mockTransfers)
			expect(mockPayoutsService.listTransfersToAccount).toHaveBeenCalledWith(
				TEST_ACCOUNT_ID,
				options
			)
		})

		it('createDashboardLoginLink delegates to ConnectPayoutsService', async () => {
			const mockUrl = 'https://connect.stripe.com/login/test'
			mockPayoutsService.createDashboardLoginLink.mockResolvedValue(mockUrl)

			const result = await service.createDashboardLoginLink(TEST_ACCOUNT_ID)

			expect(result).toBe(mockUrl)
			expect(mockPayoutsService.createDashboardLoginLink).toHaveBeenCalledWith(
				TEST_ACCOUNT_ID
			)
		})
	})
})
