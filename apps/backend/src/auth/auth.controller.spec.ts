import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import type { AuthServiceValidatedUser, ValidatedUser } from '@repo/shared'
import type { Request } from 'express'
// import type { User } from '@supabase/supabase-js' // Unused import
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

// Mock the AuthService class entirely since it's directly instantiated
jest.mock('./auth.service', () => {
	return {
		AuthService: jest.fn().mockImplementation(() => ({
			testSupabaseConnection: jest.fn(),
			getUserBySupabaseId: jest.fn(),
			refreshToken: jest.fn(),
			login: jest.fn(),
			createUser: jest.fn(),
			logout: jest.fn(),
			saveDraft: jest.fn(),
			getDraft: jest.fn()
		}))
	}
})

describe('AuthController', () => {
	let controller: AuthController
	let mockAuthServiceInstance: jest.Mocked<AuthService>

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		const module: TestingModule = await Test.createTestingModule({
			imports: [
				ThrottlerModule.forRoot({
					throttlers: [
						{
							ttl: 60,
							limit: 100
						}
					]
				})
			],
			controllers: [AuthController],
			providers: [AuthService]
		}).compile()

		controller = module.get<AuthController>(AuthController)
		// Get the mocked instance that was created during controller instantiation
		const controllerWithService = controller as unknown as {
			authService: jest.Mocked<AuthService>
		}
		mockAuthServiceInstance = controllerWithService.authService
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('health', () => {
		it('should return connection status', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockResolvedValue({
				connected: true
			})

			const result = await controller.health()

			expect(result.status).toEqual('healthy')
			expect(result.checks.supabase_connection).toBe(true)
			expect(
				mockAuthServiceInstance.testSupabaseConnection
			).toHaveBeenCalledTimes(1)
		})

		it('should handle connection errors', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockRejectedValue(
				new Error('Connection failed')
			)

			const result = await controller.health()

			expect(result.status).toEqual('unhealthy')
			expect(result.checks.supabase_connection).toBe(false)
		})
	})

	describe('getCurrentUser', () => {
		it('should return user profile when user is validated', async () => {
			const mockUser: ValidatedUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'TENANT',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'supa-123',
				stripeCustomerId: null,
				organizationId: null
			}

			const mockReturnedUser: AuthServiceValidatedUser = {
				...mockUser,
				role: 'TENANT',
				profileComplete: true,
				lastLoginAt: new Date()
			}

			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(
				mockReturnedUser
			)

			const result = await controller.getCurrentUser(mockUser)

			expect(result).toEqual(mockReturnedUser)
			expect(mockAuthServiceInstance.getUserBySupabaseId).toHaveBeenCalledWith(
				'user-123'
			)
		})

		it('should throw NotFoundException when user not found', async () => {
			const mockUser: ValidatedUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'TENANT',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'supa-123',
				stripeCustomerId: null,
				organizationId: null
			}

			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(null)

			await expect(controller.getCurrentUser(mockUser)).rejects.toMatchObject({
				message: 'User not found'
			})
		})
	})

	describe('refreshToken', () => {
		it('should refresh token successfully', async () => {
			const mockRefreshResult = {
				access_token: 'new-token',
				refresh_token: 'refresh-token',
				expires_in: 3600,
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					profileComplete: true,
					lastLoginAt: new Date()
				} as unknown as AuthServiceValidatedUser
			}

			const body = { refresh_token: 'old-refresh-token' }

			mockAuthServiceInstance.refreshToken.mockResolvedValue(mockRefreshResult)

			const result = await controller.refreshToken(body)

			expect(result).toEqual(mockRefreshResult)
			expect(mockAuthServiceInstance.refreshToken).toHaveBeenCalledWith(
				'old-refresh-token'
			)
		})
	})

	describe('login', () => {
		it('should login user successfully', async () => {
			const loginDto = {
				email: 'test@example.com',
				password: 'password123'
			}

			const mockRequest = {
				ip: '127.0.0.1',
				headers: {}
			} as unknown as Request

			const mockLoginResult = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
				expires_in: 3600,
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
					phone: null,
					bio: null,
					avatarUrl: null,
					role: 'TENANT',
					createdAt: new Date(),
					updatedAt: new Date(),
					emailVerified: true,
					supabaseId: 'supa-123',
					stripeCustomerId: null,
					organizationId: null,
					profileComplete: true,
					lastLoginAt: new Date()
				} as unknown as AuthServiceValidatedUser
			}

			mockAuthServiceInstance.login.mockResolvedValue(mockLoginResult)

			const result = await controller.login(loginDto, mockRequest)

			expect(result).toEqual(mockLoginResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				loginDto.email,
				loginDto.password,
				'127.0.0.1'
			)
		})

		it('should throw BadRequestException for invalid credentials', async () => {
			const loginDto = {
				email: 'test@example.com',
				password: 'wrong-password'
			}

			const mockRequest = {
				ip: '127.0.0.1',
				headers: {}
			} as unknown as Request

			mockAuthServiceInstance.login.mockRejectedValue(
				new Error('Invalid login credentials')
			)

			await expect(controller.login(loginDto, mockRequest)).rejects.toThrow(
				'Invalid login credentials'
			)
		})
	})

	describe('register', () => {
		it('should register new user successfully', async () => {
			const registerDto = {
				email: 'new@example.com',
				password: 'password123',
				firstName: 'New',
				lastName: 'User'
			}

			const mockRegisterResult = {
				user: {
					id: 'user-456',
					email: 'new@example.com',
					name: 'New User'
				},
				access_token: 'access-token',
				refresh_token: 'refresh-token'
			}

			mockAuthServiceInstance.createUser.mockResolvedValue(mockRegisterResult)

			const result = await controller.register(registerDto)

			expect(result).toEqual(mockRegisterResult)
			expect(mockAuthServiceInstance.createUser).toHaveBeenCalledWith({
				email: registerDto.email,
				password: registerDto.password,
				name: 'New User'
			})
		})
	})

	describe('logout', () => {
		it('should logout user successfully', async () => {
			const mockRequest = {
				headers: {
					authorization: 'Bearer test-token-123'
				}
			} as unknown as Request

			mockAuthServiceInstance.logout.mockResolvedValue(undefined)

			const result = await controller.logout(mockRequest)

			expect(result).toEqual({ success: true })
			expect(mockAuthServiceInstance.logout).toHaveBeenCalledWith(
				'test-token-123'
			)
		})
	})

	describe('saveDraft', () => {
		it('should save draft successfully', async () => {
			const draftDto = {
				email: 'test@example.com',
				name: 'Test User',
				formType: 'signup' as const
			}

			const mockSaveDraftResult = {
				success: true,
				sessionId: 'draft-id'
			}

			mockAuthServiceInstance.saveDraft.mockResolvedValue(mockSaveDraftResult)

			const result = await controller.saveDraft(draftDto)

			expect(result).toEqual(mockSaveDraftResult)
			expect(mockAuthServiceInstance.saveDraft).toHaveBeenCalledWith(draftDto)
		})
	})

	describe('getDraft', () => {
		it('should retrieve draft successfully', async () => {
			const mockDraftResult = {
				email: 'test@example.com',
				name: 'Test User'
			}

			const mockRequest = {
				headers: {
					'x-session-id': 'session-123'
				}
			} as unknown as Request

			const body = { sessionId: 'session-123' }

			mockAuthServiceInstance.getDraft.mockResolvedValue(mockDraftResult)

			const result = await controller.getDraft(body, mockRequest)

			expect(result).toEqual(mockDraftResult)
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith(
				'session-123'
			)
		})

		it('should return null when draft not found', async () => {
			const mockRequest = {
				headers: {
					'x-session-id': 'session-456'
				}
			} as unknown as Request

			const body = { sessionId: 'session-456' }

			mockAuthServiceInstance.getDraft.mockResolvedValue(null)

			const result = await controller.getDraft(body, mockRequest)

			expect(result).toBeNull()
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith(
				'session-456'
			)
		})
	})
})
