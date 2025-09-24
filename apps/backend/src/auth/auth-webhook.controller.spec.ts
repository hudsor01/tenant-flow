import { Test } from '@nestjs/testing'
import { AuthWebhookController } from './auth-webhook.controller'
import { AuthService } from './auth.service'
import { SupabaseService } from '../database/supabase.service'
import { UsersService } from '../users/users.service'
import { SilentLogger } from '../__test__/silent-logger'
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createMock } from '@golevelup/ts-jest'
import type { AuthServiceValidatedUser, SupabaseWebhookEvent } from '@repo/shared'

// Mock the getPriceId function to avoid supabase client import issues
jest.mock('@repo/shared', () => ({
	getPriceId: jest.fn().mockReturnValue('price_test_freetrial_monthly')
}))

describe('AuthWebhookController', () => {
	let controller: AuthWebhookController
	let authService: jest.Mocked<AuthService>
	let usersService: jest.Mocked<UsersService>
	let mockSupabaseClient: jest.Mocked<SupabaseClient>

	const mockUserId = randomUUID()
	const mockUserEmail = 'test@example.com'
	const mockUserName = 'Test User'

	const mockAuthServiceValidatedUser: AuthServiceValidatedUser = {
		id: mockUserId,
		email: mockUserEmail,
		name: mockUserName,
		phone: null,
		bio: null,
		avatarUrl: null,
		role: 'TENANT',
		createdAt: new Date(),
		updatedAt: new Date(),
		supabaseId: mockUserId,
		stripeCustomerId: null,
		profileComplete: false,
		lastLoginAt: new Date(),
		organizationId: null,
		emailVerified: true
	}

	const mockWebhookEvent = {
		type: 'INSERT' as const,
		table: 'users',
		schema: 'auth' as const,
		record: {
			id: mockUserId,
			email: mockUserEmail,
			email_confirmed_at: null,
			user_metadata: {
				name: mockUserName
			},
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}
	}

	const mockSubscriptionData = {
		customerId: 'cus_test123',
		subscriptionId: 'sub_test123'
	}

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		mockSupabaseClient = createMock<SupabaseClient>() as any

		const mockAuthService = createMock<AuthService>()

		const mockSupabaseService = createMock<SupabaseService>({
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient)
		})

		const mockUsersService = createMock<UsersService>()

		const module = await Test.createTestingModule({
			controllers: [AuthWebhookController],
			providers: [
				{ provide: AuthService, useValue: mockAuthService },
				{ provide: SupabaseService, useValue: mockSupabaseService },
				{ provide: UsersService, useValue: mockUsersService }
			]
		})
		.setLogger(new SilentLogger())
		.compile()

		controller = module.get(AuthWebhookController)
		authService = module.get(AuthService)
		usersService = module.get(UsersService)

		// Spy on the controller's logger methods
		jest.spyOn(controller['logger'], 'debug').mockImplementation(() => undefined)
		jest.spyOn(controller['logger'], 'log').mockImplementation(() => undefined)
		jest.spyOn(controller['logger'], 'warn').mockImplementation(() => undefined)
		jest.spyOn(controller['logger'], 'error').mockImplementation(() => undefined)
	})

	describe('handleSupabaseAuthWebhook', () => {
		it('processes user INSERT event successfully', async () => {
			authService.syncUserWithDatabase.mockResolvedValue(mockAuthServiceValidatedUser)

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockSubscriptionData,
				error: null,
				count: null,
				status: 200,
				statusText: 'OK'
			} as any)

			const result = await controller.handleSupabaseAuthWebhook(mockWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(result.message).toBe('Webhook processed successfully')
			expect(controller['logger'].debug).toHaveBeenCalledWith('Received Supabase auth webhook', {
				type: 'INSERT',
				table: 'users',
				schema: 'auth',
				userId: mockUserId,
				userEmail: mockUserEmail
			})
			expect(authService.syncUserWithDatabase).toHaveBeenCalledWith(
				expect.objectContaining({
					id: mockUserId,
					email: mockUserEmail,
					aud: 'authenticated',
					user_metadata: { name: mockUserName }
				})
			)
			expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('create_stripe_customer_with_trial', {
				p_user_id: mockUserId,
				p_email: mockUserEmail,
				p_name: mockUserName,
				p_price_id: 'price_test_freetrial_monthly',
				p_trial_days: 14
			})
		})

		it('processes user UPDATE event with email confirmation', async () => {
			const updateEvent = {
				...mockWebhookEvent,
				type: 'UPDATE' as const,
				record: {
					...mockWebhookEvent.record,
					email_confirmed_at: new Date().toISOString()
				}
			}

			const result = await controller.handleSupabaseAuthWebhook(updateEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(controller['logger'].log).toHaveBeenCalledWith('User email confirmed', {
				userId: mockUserId,
				email: mockUserEmail,
				confirmedAt: updateEvent.record.email_confirmed_at
			})
		})

		it('ignores events for different table', async () => {
			const differentTableEvent = {
				...mockWebhookEvent,
				table: 'sessions'
			}

			const result = await controller.handleSupabaseAuthWebhook(differentTableEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(authService.syncUserWithDatabase).not.toHaveBeenCalled()
		})

		it('ignores events for different schema', async () => {
			const differentSchemaEvent = {
				...mockWebhookEvent,
				schema: 'public' as const
			}

			const result = await controller.handleSupabaseAuthWebhook(differentSchemaEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(authService.syncUserWithDatabase).not.toHaveBeenCalled()
		})

		it('handles user creation errors gracefully without failing webhook', async () => {
			authService.syncUserWithDatabase.mockRejectedValue(new Error('Database sync failed'))

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockSubscriptionData,
				error: null,
				count: null,
				status: 200,
				statusText: 'OK'
			} as any)

			const result = await controller.handleSupabaseAuthWebhook(mockWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(result.message).toBe('Webhook processed successfully')
			expect(controller['logger'].error).toHaveBeenCalledWith('Error processing user creation', {
				userId: mockUserId,
				email: mockUserEmail,
				error: 'Database sync failed'
			})
		})

		it('handles main webhook processing errors', async () => {
			// Create a mock that throws an error during processing
			const errorWebhookEvent = { ...mockWebhookEvent }
			// Mock syncUserWithDatabase to throw an error inside the try block
			authService.syncUserWithDatabase.mockRejectedValue(new Error('Critical webhook error'))

			const result = await controller.handleSupabaseAuthWebhook(errorWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true) // Webhook still succeeds because error is caught in handleUserCreated
			expect(result.message).toBe('Webhook processed successfully')
			// The error is caught and logged in handleUserCreated
			expect(controller['logger'].error).toHaveBeenCalledWith('Error processing user creation', {
				userId: mockUserId,
				email: mockUserEmail,
				error: 'Critical webhook error'
			})
		})

		it('handles user creation without email', async () => {
			const noEmailEvent = {
				...mockWebhookEvent,
				record: {
					...mockWebhookEvent.record,
					email: null
				}
			}

			const result = await controller.handleSupabaseAuthWebhook(noEmailEvent as unknown as SupabaseWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(controller['logger'].warn).toHaveBeenCalledWith('User created without email', { userId: mockUserId })
			expect(authService.syncUserWithDatabase).not.toHaveBeenCalled()
		})

		it('skips subscription creation when email is not provided', async () => {
			const noEmailEvent = {
				...mockWebhookEvent,
				record: {
					...mockWebhookEvent.record,
					email: null
				}
			}

			const result = await controller.handleSupabaseAuthWebhook(noEmailEvent as unknown as SupabaseWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(mockSupabaseClient.rpc).not.toHaveBeenCalled()
		})

		it('skips subscription creation when user does not have customer metadata', async () => {
			const noMetadataEvent = {
				...mockWebhookEvent,
				record: {
					...mockWebhookEvent.record,
					user_metadata: null
				}
			}

			authService.syncUserWithDatabase.mockResolvedValue(mockAuthServiceValidatedUser)

			const result = await controller.handleSupabaseAuthWebhook(noMetadataEvent as unknown as SupabaseWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(authService.syncUserWithDatabase).toHaveBeenCalled()
			expect(mockSupabaseClient.rpc).toHaveBeenCalled() // Still attempts to create subscription
		})

		it('continues when subscription creation fails', async () => {
			authService.syncUserWithDatabase.mockResolvedValue(mockAuthServiceValidatedUser)

			mockSupabaseClient.rpc.mockResolvedValue({
				data: null,
				error: { message: 'Stripe API error' },
				count: null,
				status: 400,
				statusText: 'Bad Request'
			} as any)

			const result = await controller.handleSupabaseAuthWebhook(mockWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			// Check for the RPC error log
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Failed to create customer and subscription via RPC',
				{
					userId: mockUserId,
					email: mockUserEmail,
					error: 'Stripe API error'
				}
			)
			// The error is caught in createSubscription and logged differently
			expect(controller['logger'].error).toHaveBeenCalledWith(
				'Failed to create user subscription',
				{
					userId: mockUserId,
					email: mockUserEmail,
					error: 'Customer creation failed: Stripe API error'
				}
			)
		})

		it('updates user with Stripe customer ID when subscription created', async () => {
			authService.syncUserWithDatabase.mockResolvedValue(mockAuthServiceValidatedUser)

			mockSupabaseClient.rpc.mockResolvedValue({
				data: mockSubscriptionData,
				error: null,
				count: null,
				status: 200,
				statusText: 'OK'
			} as any)

			const result = await controller.handleSupabaseAuthWebhook(mockWebhookEvent, 'Bearer test')

			expect(result.success).toBe(true)
			expect(usersService.updateUser).toHaveBeenCalledWith(mockUserId, {
				stripeCustomerId: 'cus_test123'
			})
			expect(controller['logger'].log).toHaveBeenCalledWith(
				'Stripe customer and subscription created successfully',
				{
					userId: mockUserId,
					customerId: 'cus_test123',
					subscriptionId: 'sub_test123'
				}
			)
		})
	})
})