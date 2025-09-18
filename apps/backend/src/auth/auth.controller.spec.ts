import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import type { ValidatedUser } from '@repo/shared'

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
		mockAuthServiceInstance = (AuthService as jest.MockedClass<typeof AuthService>).mock.results[0].value
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('health', () => {
		it('should return healthy status when all checks pass', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockResolvedValue({ connected: true })

			const result = await controller.health()

			expect(result).toMatchObject({
				status: 'healthy',
				environment: 'test',
				checks: {
					supabase_url: true,
					supabase_service_key: true,
					supabase_connection: true
				}
			})
			expect(result.timestamp).toBeDefined()
		})

		it('should return unhealthy status when connection fails', async () => {
			mockAuthServiceInstance.testSupabaseConnection.mockRejectedValue(new Error('Connection failed'))

			const result = await controller.health()

			expect(result).toMatchObject({
				status: 'unhealthy',
				environment: 'test',
				checks: {
					supabase_url: true,
					supabase_service_key: true,
					supabase_connection: false
				}
			})
		})

		it('should return unhealthy when env vars are missing', async () => {
			// Temporarily clear env vars
			const originalUrl = process.env.SUPABASE_URL
			const originalKey = process.env.SERVICE_ROLE_KEY
			delete process.env.SUPABASE_URL
			delete process.env.SERVICE_ROLE_KEY

			mockAuthServiceInstance.testSupabaseConnection.mockResolvedValue({ connected: true })

			const result = await controller.health()

			expect(result).toMatchObject({
				status: 'unhealthy',
				environment: 'test',
				checks: {
					supabase_url: false,
					supabase_service_key: false,
					supabase_connection: true
				}
			})

			// Restore env vars
			process.env.SUPABASE_URL = originalUrl
			process.env.SERVICE_ROLE_KEY = originalKey
		})
	})

	describe('getCurrentUser', () => {
		it('should return user profile when found', async () => {
			const user: ValidatedUser = { id: 'user-123', email: 'test@example.com' }
			const userProfile = { id: 'user-123', email: 'test@example.com', name: 'Test User' }
			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(userProfile)

			const result = await controller.getCurrentUser(user)

			expect(result).toEqual(userProfile)
			expect(mockAuthServiceInstance.getUserBySupabaseId).toHaveBeenCalledWith('user-123')
		})

		it('should throw NotFoundException when user not found', async () => {
			const user: ValidatedUser = { id: 'user-123', email: 'test@example.com' }
			mockAuthServiceInstance.getUserBySupabaseId.mockResolvedValue(null)

			await expect(controller.getCurrentUser(user)).rejects.toThrow('User not found')
		})
	})

	describe('refreshToken', () => {
		it('should refresh token successfully', async () => {
			const refreshToken = 'refresh-token-123'
			const expectedResult = { access_token: 'new-token', refresh_token: 'new-refresh' }
			mockAuthServiceInstance.refreshToken.mockResolvedValue(expectedResult)

			const result = await controller.refreshToken({ refresh_token: refreshToken })

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.refreshToken).toHaveBeenCalledWith(refreshToken)
		})
	})

	describe('login', () => {
		it('should login successfully with IP from request', async () => {
			const loginData = { email: 'test@example.com', password: 'password123' }
			const expectedResult = { access_token: 'token', user: { id: 'user-123' } }
			mockAuthServiceInstance.login.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: {},
				ip: '192.168.1.1'
			} as any

			const result = await controller.login(loginData, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				'192.168.1.1'
			)
		})

		it('should use forwarded IP when request.ip is not available', async () => {
			const loginData = { email: 'test@example.com', password: 'password123' }
			const expectedResult = { access_token: 'token', user: { id: 'user-123' } }
			mockAuthServiceInstance.login.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: { 'x-forwarded-for': '10.0.0.1' },
				ip: null // No direct IP available
			} as any

			const result = await controller.login(loginData, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				'10.0.0.1'
			)
		})

		it('should handle array of forwarded IPs when request.ip is not available', async () => {
			const loginData = { email: 'test@example.com', password: 'password123' }
			const expectedResult = { access_token: 'token', user: { id: 'user-123' } }
			mockAuthServiceInstance.login.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
				ip: null // No direct IP available
			} as any

			const result = await controller.login(loginData, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				'10.0.0.1'
			)
		})

		it('should use unknown when no IP available', async () => {
			const loginData = { email: 'test@example.com', password: 'password123' }
			const expectedResult = { access_token: 'token', user: { id: 'user-123' } }
			mockAuthServiceInstance.login.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: {}
			} as any

			const result = await controller.login(loginData, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.login).toHaveBeenCalledWith(
				'test@example.com',
				'password123',
				'unknown'
			)
		})
	})

	describe('register', () => {
		it('should register a new user successfully', async () => {
			const registerData = {
				email: 'new@example.com',
				password: 'password123',
				firstName: 'John',
				lastName: 'Doe'
			}
			const expectedResult = { user: { id: 'user-123', email: 'new@example.com' } }
			mockAuthServiceInstance.createUser.mockResolvedValue(expectedResult)

			const result = await controller.register(registerData)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.createUser).toHaveBeenCalledWith({
				email: 'new@example.com',
				password: 'password123',
				name: 'John Doe'
			})
		})

		it('should handle single name correctly', async () => {
			const registerData = {
				email: 'new@example.com',
				password: 'password123',
				firstName: 'John',
				lastName: ''
			}
			const expectedResult = { user: { id: 'user-123' } }
			mockAuthServiceInstance.createUser.mockResolvedValue(expectedResult)

			const result = await controller.register(registerData)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.createUser).toHaveBeenCalledWith({
				email: 'new@example.com',
				password: 'password123',
				name: 'John'
			})
		})
	})

	describe('logout', () => {
		it('should logout successfully with Bearer token', async () => {
			mockAuthServiceInstance.logout.mockResolvedValue(undefined)

			const mockRequest = {
				headers: { authorization: 'Bearer token-123' }
			} as any

			const result = await controller.logout(mockRequest)

			expect(result).toEqual({ success: true })
			expect(mockAuthServiceInstance.logout).toHaveBeenCalledWith('token-123')
		})

		it('should handle non-Bearer auth header', async () => {
			mockAuthServiceInstance.logout.mockResolvedValue(undefined)

			const mockRequest = {
				headers: { authorization: 'Basic sometoken' }
			} as any

			const result = await controller.logout(mockRequest)

			expect(result).toEqual({ success: true })
			expect(mockAuthServiceInstance.logout).toHaveBeenCalledWith('')
		})

		it('should throw UnauthorizedException when no auth header', async () => {
			const mockRequest = {
				headers: {}
			} as any

			await expect(controller.logout(mockRequest)).rejects.toThrow('No authorization header found')
		})
	})

	describe('saveDraft', () => {
		it('should save draft successfully', async () => {
			const draftData = {
				email: 'test@example.com',
				name: 'Test User',
				formType: 'signup' as const
			}
			const expectedResult = { success: true }
			mockAuthServiceInstance.saveDraft.mockResolvedValue(expectedResult)

			const result = await controller.saveDraft(draftData)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.saveDraft).toHaveBeenCalledWith(draftData)
		})
	})

	describe('getDraft', () => {
		it('should get draft with sessionId from body', async () => {
			const expectedResult = { email: 'test@example.com', formType: 'login' }
			mockAuthServiceInstance.getDraft.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: {}
			} as any

			const result = await controller.getDraft({ sessionId: 'session-123' }, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith('session-123')
		})

		it('should get draft with sessionId from headers', async () => {
			const expectedResult = { email: 'test@example.com', formType: 'login' }
			mockAuthServiceInstance.getDraft.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: { 'x-session-id': 'session-456' }
			} as any

			const result = await controller.getDraft({}, mockRequest)

			expect(result).toEqual(expectedResult)
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith('session-456')
		})

		it('should handle missing sessionId', async () => {
			const expectedResult = null
			mockAuthServiceInstance.getDraft.mockResolvedValue(expectedResult)

			const mockRequest = {
				headers: {}
			} as any

			const result = await controller.getDraft({}, mockRequest)

			expect(result).toBeNull()
			expect(mockAuthServiceInstance.getDraft).toHaveBeenCalledWith(undefined)
		})
	})
})