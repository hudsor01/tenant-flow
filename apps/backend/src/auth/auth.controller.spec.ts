/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import type { ValidatedUser } from '@repo/shared'
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
		mockAuthServiceInstance = (controller as any).authService
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('testConnection', () => {
		it('should return connection status', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockResolvedValue({
				healthy: true,
				message: 'Supabase connection successful'
			})

			const result = await controller.testConnection()

			expect(result).toEqual({
				healthy: true,
				message: 'Supabase connection successful'
			})
			expect(
				mockAuthServiceInstance.testSupabaseConnection
			).toHaveBeenCalledTimes(1)
		})

		it('should handle connection errors', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockRejectedValue(
				new Error('Connection failed')
			)

			await expect(controller.testConnection()).rejects.toThrow(
				'Connection failed'
			)
		})
	})

	describe('getProfile', () => {
		it('should return user profile when user is validated', async () => {
			const mockUser: ValidatedUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				phone: null,
				bio: null,
				avatarUrl: null,
				role: 'user',
				createdAt: new Date(),
				updatedAt: new Date(),
				emailVerified: true,
				supabaseId: 'supa-123',
				stripeCustomerId: null,
				organizationId: null
			}

			const user = { id: 'supa-123', email: 'test@example.com' } as any

			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(mockUser)

			const result = await controller.getProfile(user)

			expect(result).toEqual(mockUser)
			expect(mockAuthServiceInstance.getUserBySupabaseId).toHaveBeenCalledWith(
				'supa-123'
			)
		})

		it('should throw NotFoundException when user not found', async () => {
			const user = { id: 'supa-123', email: 'test@example.com' } as any

			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(null)

			await expect(controller.getProfile(user)).rejects.toMatchObject({
				message: 'User not found'
			})
		})
	})

	describe('refreshToken', () => {
		it('should refresh token successfully', async () => {
			const mockToken = {
				accessToken: 'new-token',
				refreshToken: 'refresh-token',
				expiresIn: 3600
			}

			mockAuthServiceInstance.refreshToken.mockResolvedValue(mockToken)

			const result = await controller.refreshToken('old-refresh-token')

			expect(result).toEqual(mockToken)
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

			const mockLoginResult = {
				user: {
					id: 'user-123',
					email: 'test@example.com'
				},
				session: {
					accessToken: 'access-token',
					refreshToken: 'refresh-token'
				}
			}

			mockAuthServiceInstance.login.mockResolvedValue(mockLoginResult as any)

			const result = await controller.login(loginDto)

			expect(result).toEqual(mockLoginResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				loginDto.email,
				loginDto.password
			)
		})

		it('should throw BadRequestException for invalid credentials', async () => {
			const loginDto = {
				email: 'test@example.com',
				password: 'wrong-password'
			}

			mockAuthServiceInstance.login.mockRejectedValue(
				new Error('Invalid login credentials')
			)

			await expect(controller.login(loginDto)).rejects.toThrow(
				'Invalid login credentials'
			)
		})
	})

	describe('register', () => {
		it('should register new user successfully', async () => {
			const registerDto = {
				email: 'new@example.com',
				password: 'password123',
				name: 'New User'
			}

			const mockRegisterResult = {
				user: {
					id: 'user-456',
					email: 'new@example.com'
				},
				session: null
			}

			mockAuthServiceInstance.createUser.mockResolvedValue(
				mockRegisterResult as any
			)

			const result = await controller.register(registerDto)

			expect(result).toEqual(mockRegisterResult)
			expect(mockAuthServiceInstance.createUser).toHaveBeenCalledWith(
				registerDto.email,
				registerDto.password,
				registerDto.name
			)
		})
	})

	describe('logout', () => {
		it('should logout user successfully', async () => {
			mockAuthServiceInstance.logout.mockResolvedValue(undefined)

			const result = await controller.logout()

			expect(result).toEqual({ message: 'Logged out successfully' })
			expect(mockAuthServiceInstance.logout).toHaveBeenCalledTimes(1)
		})
	})

	describe('saveDraft', () => {
		it('should save draft successfully', async () => {
			const draftDto = {
				key: 'draft-123',
				data: { content: 'Test content' }
			}

			const mockDraft = {
				id: 'draft-id',
				userId: 'user-123',
				key: 'draft-123',
				data: { content: 'Test content' },
				createdAt: new Date(),
				updatedAt: new Date()
			}

			const user = { id: 'user-123' } as ValidatedUser

			mockAuthServiceInstance.saveDraft.mockResolvedValue(mockDraft)

			const result = await controller.saveDraft(user, draftDto)

			expect(result).toEqual(mockDraft)
			expect(mockAuthServiceInstance.saveDraft).toHaveBeenCalledWith(
				user.id,
				draftDto.key,
				draftDto.data
			)
		})
	})

	describe('getDraft', () => {
		it('should retrieve draft successfully', async () => {
			const mockDraft = {
				id: 'draft-id',
				userId: 'user-123',
				key: 'draft-123',
				data: { content: 'Test content' },
				createdAt: new Date(),
				updatedAt: new Date()
			}

			const user = { id: 'user-123' } as ValidatedUser

			mockAuthServiceInstance.getDraft.mockResolvedValue(mockDraft)

			const result = await controller.getDraft(user, 'draft-123')

			expect(result).toEqual(mockDraft)
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith(
				'user-123',
				'draft-123'
			)
		})

		it('should return null when draft not found', async () => {
			const user = { id: 'user-123' } as ValidatedUser

			mockAuthServiceInstance.getDraft.mockResolvedValue(null)

			const result = await controller.getDraft(user, 'non-existent')

			expect(result).toBeNull()
		})
	})
})
