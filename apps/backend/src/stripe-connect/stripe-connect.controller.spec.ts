import { BadRequestException, NotFoundException } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { StripeConnectController } from './stripe-connect.controller'
import type { ConnectedAccountRow } from './stripe-connect.service'
import { StripeConnectService } from './stripe-connect.service'

describe('StripeConnectController', () => {
	let controller: StripeConnectController
	let service: jest.Mocked<StripeConnectService>

	const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
	const mockEmail = 'landlord@example.com'
	const mockStripeAccountId = 'acct_test123'

	const mockAuthRequest = {
		user: {
			id: mockUserId,
			email: mockEmail
		}
	} as any

	beforeEach(async () => {
		const mockService = {
			createConnectedAccount: jest.fn(),
			getUserConnectedAccount: jest.fn(),
			createAccountLink: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			controllers: [StripeConnectController],
			providers: [
				{
					provide: StripeConnectService,
					useValue: mockService
				}
			]
		}).compile()

		controller = module.get<StripeConnectController>(StripeConnectController)
		service = module.get(
			StripeConnectService
		) as jest.Mocked<StripeConnectService>
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('createConnectedAccount', () => {
		const createDto = {
			displayName: 'Test Landlord',
			businessName: 'Test Properties LLC',
			country: 'US',
			entityType: 'individual' as const
		}

		const mockServiceResponse = {
			accountId: mockStripeAccountId,
			onboardingUrl: 'https://connect.stripe.com/setup/test123',
			status: 'pending'
		}

		it('should create connected account successfully', async () => {
			service.getUserConnectedAccount.mockResolvedValue(null)
			service.createConnectedAccount.mockResolvedValue(mockServiceResponse)

			const result = await controller.createConnectedAccount(
				mockAuthRequest,
				createDto
			)

			expect(service.getUserConnectedAccount).toHaveBeenCalledWith(mockUserId)
			expect(service.createConnectedAccount).toHaveBeenCalledWith({
				userId: mockUserId,
				email: mockEmail,
				displayName: createDto.displayName,
				businessName: createDto.businessName,
				country: createDto.country,
				entityType: createDto.entityType
			})
			expect(result).toEqual({
				success: true,
				data: mockServiceResponse
			})
		})

		it('should throw BadRequestException if user ID missing', async () => {
			const requestWithoutUser = { user: undefined } as any

			await expect(
				controller.createConnectedAccount(requestWithoutUser, createDto)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.createConnectedAccount(requestWithoutUser, createDto)
			).rejects.toThrow('User ID and email required')
		})

		it('should throw BadRequestException if email missing', async () => {
			const requestWithoutEmail = {
				user: { id: mockUserId }
			} as any

			await expect(
				controller.createConnectedAccount(requestWithoutEmail, createDto)
			).rejects.toThrow(BadRequestException)
		})

		it('should throw BadRequestException if displayName missing', async () => {
			const dtoWithoutDisplayName = {
				country: 'US',
				entityType: 'individual' as const
			}

			await expect(
				controller.createConnectedAccount(
					mockAuthRequest,
					dtoWithoutDisplayName as any
				)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.createConnectedAccount(
					mockAuthRequest,
					dtoWithoutDisplayName as any
				)
			).rejects.toThrow('Display name is required')
		})

		it('should throw BadRequestException if user already has connected account', async () => {
			const existingAccount: ConnectedAccountRow = {
				id: 'conn_123',
				userId: mockUserId,
				stripeAccountId: mockStripeAccountId,
				accountType: 'express',
				accountStatus: 'active',
				chargesEnabled: true,
				payoutsEnabled: true,
				detailsSubmitted: true,
				displayName: 'Test Landlord',
				contactEmail: mockEmail,
				country: 'US',
				currency: 'usd',
				businessType: 'individual',
				onboardingCompleted: true,
				onboardingCompletedAt: new Date().toISOString(),
				capabilities: {},
				requirements: {},
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			service.getUserConnectedAccount.mockResolvedValue(existingAccount)

			await expect(
				controller.createConnectedAccount(mockAuthRequest, createDto)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.createConnectedAccount(mockAuthRequest, createDto)
			).rejects.toThrow('User already has a connected account')
		})

		it('should handle service errors', async () => {
			service.getUserConnectedAccount.mockResolvedValue(null)
			service.createConnectedAccount.mockRejectedValue(
				new Error('Stripe API error')
			)

			await expect(
				controller.createConnectedAccount(mockAuthRequest, createDto)
			).rejects.toThrow('Stripe API error')
		})
	})

	describe('getConnectedAccount', () => {
		const mockAccount: ConnectedAccountRow = {
			id: 'conn_123',
			userId: mockUserId,
			stripeAccountId: mockStripeAccountId,
			accountType: 'express',
			accountStatus: 'active',
			chargesEnabled: true,
			payoutsEnabled: true,
			detailsSubmitted: true,
			displayName: 'Test Landlord',
			contactEmail: mockEmail,
			country: 'US',
			currency: 'usd',
			businessType: 'individual',
			onboardingCompleted: true,
			onboardingCompletedAt: new Date().toISOString(),
			capabilities: {},
			requirements: {},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		it('should return connected account for authenticated user', async () => {
			service.getUserConnectedAccount.mockResolvedValue(mockAccount)

			const result = await controller.getConnectedAccount(mockAuthRequest)

			expect(service.getUserConnectedAccount).toHaveBeenCalledWith(mockUserId)
			expect(result).toEqual({
				success: true,
				data: mockAccount
			})
		})

		it('should throw BadRequestException if user ID missing', async () => {
			const requestWithoutUser = { user: undefined } as any

			await expect(
				controller.getConnectedAccount(requestWithoutUser)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.getConnectedAccount(requestWithoutUser)
			).rejects.toThrow('User ID required')
		})

		it('should throw NotFoundException if no account found', async () => {
			service.getUserConnectedAccount.mockResolvedValue(null)

			await expect(
				controller.getConnectedAccount(mockAuthRequest)
			).rejects.toThrow(NotFoundException)
			await expect(
				controller.getConnectedAccount(mockAuthRequest)
			).rejects.toThrow('No connected account found')
		})
	})

	describe('refreshOnboarding', () => {
		const mockAccount: ConnectedAccountRow = {
			id: 'conn_123',
			userId: mockUserId,
			stripeAccountId: mockStripeAccountId,
			accountType: 'express',
			accountStatus: 'pending',
			chargesEnabled: false,
			payoutsEnabled: false,
			detailsSubmitted: false,
			displayName: 'Test Landlord',
			contactEmail: mockEmail,
			country: 'US',
			currency: 'usd',
			businessType: 'individual',
			onboardingCompleted: false,
			onboardingCompletedAt: null,
			capabilities: {},
			requirements: {},
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		const mockOnboardingUrl = 'https://connect.stripe.com/setup/test456'

		it('should generate fresh onboarding link', async () => {
			service.getUserConnectedAccount.mockResolvedValue(mockAccount)
			service.createAccountLink.mockResolvedValue(mockOnboardingUrl)

			const result = await controller.refreshOnboarding(mockAuthRequest)

			expect(service.getUserConnectedAccount).toHaveBeenCalledWith(mockUserId)
			expect(service.createAccountLink).toHaveBeenCalledWith(
				mockStripeAccountId
			)
			expect(result).toEqual({
				success: true,
				data: {
					onboardingUrl: mockOnboardingUrl
				}
			})
		})

		it('should throw BadRequestException if user ID missing', async () => {
			const requestWithoutUser = { user: undefined } as any

			await expect(
				controller.refreshOnboarding(requestWithoutUser)
			).rejects.toThrow(BadRequestException)
			await expect(
				controller.refreshOnboarding(requestWithoutUser)
			).rejects.toThrow('User ID required')
		})

		it('should throw NotFoundException if no account found', async () => {
			service.getUserConnectedAccount.mockResolvedValue(null)

			await expect(
				controller.refreshOnboarding(mockAuthRequest)
			).rejects.toThrow(NotFoundException)
			await expect(
				controller.refreshOnboarding(mockAuthRequest)
			).rejects.toThrow('No connected account found')
		})

		it('should handle service errors when creating account link', async () => {
			service.getUserConnectedAccount.mockResolvedValue(mockAccount)
			service.createAccountLink.mockRejectedValue(new Error('Stripe API error'))

			await expect(
				controller.refreshOnboarding(mockAuthRequest)
			).rejects.toThrow('Stripe API error')
		})
	})
})
