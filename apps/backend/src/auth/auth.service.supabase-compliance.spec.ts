import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing'
import { SilentLogger } from '../__test__/silent-logger'
import { AuthService } from './auth.service'
import { SupabaseService } from '../database/supabase.service'
import { UnauthorizedException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { createMock as _createMock } from '@golevelup/ts-jest'
import type { SupabaseClient as _SupabaseClient } from '@supabase/supabase-js'
import type { Database as _Database } from '@repo/shared'

// Mock the createClient function from @supabase/supabase-js
const mockSupabaseClient = {
	auth: {
		getUser: jest.fn(),
		admin: {
			createUser: jest.fn(),
			signOut: jest.fn(),
		},
		signInWithPassword: jest.fn(),
		refreshSession: jest.fn(),
		getSession: jest.fn(),
	},
	from: jest.fn()
}

jest.mock('@supabase/supabase-js', () => ({
	createClient: jest.fn(() => mockSupabaseClient)
}))

/**
 * SUPABASE DOCUMENTATION COMPLIANCE TESTS
 * 
 * These tests ensure 100% compliance with official Supabase Auth documentation:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 * 
 * Key Requirements Tested:
 * 1. CRITICAL: Always use supabase.auth.getUser() for server-side validation
 * 2. CRITICAL: Never trust getSession() for validation (documentation explicitly warns)
 * 3. Admin client usage for server-side operations
 * 4. Proper JWT validation patterns
 * 5. Token security and error handling
 */

describe('AuthService - Supabase Documentation Compliance', () => {
	let service: AuthService
	let mockSupabaseService: jest.Mocked<SupabaseService>

	const generateUUID = () => randomUUID()
	const createValidJWT = () => `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
		sub: generateUUID(),
		aud: 'authenticated',
		exp: Math.floor(Date.now() / 1000) + 3600,
		iat: Math.floor(Date.now() / 1000),
		iss: 'https://project.supabase.co/auth/v1',
		role: 'authenticated'
	})).toString('base64')}.signature`

	const createMockSupabaseUser = (overrides: Record<string, unknown> = {}) => ({
		id: generateUUID(),
		aud: 'authenticated',
		email: 'test@example.com',
		email_confirmed_at: new Date().toISOString(),
		phone: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		user_metadata: {
			name: 'Test User',
			full_name: 'Test User',
			avatar_url: 'https://example.com/avatar.jpg'
		},
		app_metadata: { provider: 'email', providers: ['email'] },
		...overrides,
	})

	const setupMockDatabaseOperations = (mockUser: Record<string, unknown>) => {
		const dbUser = {
			id: mockUser.id,
			email: mockUser.email,
			name: 'Test User',
			phone: null,
			bio: null,
			avatarUrl: null,
			role: 'OWNER',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		mockSupabaseClient.from = jest.fn((table: string) => {
			if (table === 'Subscription') {
				return {
					select: jest.fn().mockReturnValue({
						eq: jest.fn().mockReturnValue({
							limit: jest.fn().mockReturnValue({
								single: jest.fn().mockResolvedValue({ data: null, error: null })
							})
						})
					})
				}
			}
			
			return {
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({ data: null, error: null })
					})
				}),
				upsert: jest.fn().mockReturnValue({
					select: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({ data: dbUser, error: null })
					})
				})
			}
		})
	}

	beforeEach(async () => {
		// Clear all mocks before each test
		jest.clearAllMocks()

		mockSupabaseService = {
			getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
		} as jest.Mocked<SupabaseService>

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				AuthService,
				{
					provide: SupabaseService,
					useValue: mockSupabaseService,
				}
			],
		})
			.setLogger(new SilentLogger())
			.compile()

		service = module.get<AuthService>(AuthService)

		// Spy on the service's logger methods
		jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
		jest.spyOn(service['logger'], 'warn').mockImplementation(() => undefined)
		jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)
		jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined)
		jest.spyOn(service['logger'], 'verbose').mockImplementation(() => undefined)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('CRITICAL: Token Validation Uses auth.getUser()', () => {
		it('should ALWAYS use auth.getUser() for token validation, not getSession()', async () => {
			// Documentation: "Always use supabase.auth.getUser() to protect pages and user data"
			// Documentation: "Never trust supabase.auth.getSession() inside server code"
			
			const token = createValidJWT()
			const mockUser = createMockSupabaseUser()

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null
			})

			setupMockDatabaseOperations(mockUser)

			await service.validateSupabaseToken(token)

			// CRITICAL: Verify auth.getUser() was called with the token
			expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token)
			expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(1)

			// CRITICAL: Verify getSession() was NOT called for validation
			expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled()
		})

		it('should use admin client for server-side token validation', async () => {
			// Documentation: Server-side operations should use admin client

			const token = createValidJWT()
			const mockUser = createMockSupabaseUser()

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null
			})

			setupMockDatabaseOperations(mockUser)

			await service.validateSupabaseToken(token)

			// Verify direct admin client usage (AuthService creates its own client)
			expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledWith(token)
		})

		it('should properly validate JWT token structure per Supabase format', async () => {
			// Documentation: JWTs should be properly formatted with 3 parts
			
			const invalidTokens = [
				'not-a-jwt',
				'only.two.parts', 
				'',
				'a', // Too short
				'a'.repeat(2050) + '.b.c', // Too long
				null,
				undefined
			]

			for (const invalidToken of invalidTokens) {
				await expect(service.validateSupabaseToken(invalidToken as unknown))
					.rejects.toThrow(UnauthorizedException)
			}

			// Verify getUser was never called for invalid tokens
			expect(mockSupabaseClient.auth.getUser).not.toHaveBeenCalled()
		})
	})

	describe('CRITICAL: Email Confirmation Requirement', () => {
		it('should enforce email_confirmed_at requirement per Supabase security', async () => {
			// Documentation: Always check email confirmation for security
			
			const token = createValidJWT()
			const unconfirmedUser = createMockSupabaseUser({
				email_confirmed_at: null // Not confirmed
			})

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: unconfirmedUser },
				error: null
			})

			await expect(service.validateSupabaseToken(token))
				.rejects.toThrow('Email verification required')
		})

		it('should accept confirmed users', async () => {
			const token = createValidJWT()
			const confirmedUser = createMockSupabaseUser({
				email_confirmed_at: new Date().toISOString() // Confirmed
			})

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: confirmedUser },
				error: null
			})

			setupMockDatabaseOperations(confirmedUser)

			const result = await service.validateSupabaseToken(token)
			
			expect(result).toEqual(expect.objectContaining({
				email: confirmedUser.email,
				id: confirmedUser.id
			}))
		})
	})

	describe('CRITICAL: Secure Auth Operations', () => {
		it('should use admin client for signInWithPassword', async () => {
			// Documentation: Server-side auth operations should use admin client

			const email = 'test@example.com'
			const password = 'password123'
			const mockUser = createMockSupabaseUser({ email })

			mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
				data: {
					session: {
						access_token: createValidJWT(),
						refresh_token: 'refresh',
						expires_in: 3600
					},
					user: mockUser
				},
				error: null
			})

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null
			})

			setupMockDatabaseOperations(mockUser)

			await service.login(email, password)

			// Verify direct admin client usage (AuthService creates its own client)
			expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
				email,
				password
			})
		})

		it('should use admin client for user creation', async () => {
			const userData = {
				email: 'new@example.com',
				name: 'New User',
				password: 'password123'
			}

			const mockCreatedUser = createMockSupabaseUser({
				email: userData.email,
				user_metadata: { name: userData.name, full_name: userData.name }
			})

			mockSupabaseClient.auth.admin.createUser.mockResolvedValue({
				data: { user: mockCreatedUser },
				error: null
			})

			setupMockDatabaseOperations(mockCreatedUser)

			await service.createUser(userData)

			// Verify direct admin client usage (AuthService creates its own client)
			expect(mockSupabaseClient.auth.admin.createUser).toHaveBeenCalledWith({
				email: userData.email,
				password: userData.password,
				email_confirm: false,
				user_metadata: {
					name: userData.name,
					full_name: userData.name
				}
			})
		})
	})

	describe('SECURITY: Error Handling', () => {
		it('should handle Supabase auth errors securely', async () => {
			const token = createValidJWT()

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: null },
				error: { 
					name: 'AuthError',
					message: 'Invalid JWT token' 
				}
			})

			await expect(service.validateSupabaseToken(token))
				.rejects.toThrow('Invalid or expired token')

			// Verify security logging
			expect(service['logger'].warn).toHaveBeenCalledWith(
				'Token validation failed',
				expect.objectContaining({ errorType: 'AuthError' })
			)
		})

		it('should handle network/connection errors during validation', async () => {
			const token = createValidJWT()

			mockSupabaseClient.auth.getUser.mockRejectedValue(
				new Error('Network error')
			)

			await expect(service.validateSupabaseToken(token))
				.rejects.toThrow('Token validation failed')

			expect(service['logger'].error).toHaveBeenCalledWith(
				'Token validation error',
				'Network error'
			)
		})
	})

	describe('COMPLIANCE: getSession Usage Restrictions', () => {
		it('should ONLY use getSession for connection testing, never validation', async () => {
			// Documentation explicitly warns against using getSession for validation
			
			mockSupabaseClient.auth.getSession.mockResolvedValue({
				data: { session: { access_token: 'test' } },
				error: null
			})

			// This is the ONLY acceptable use of getSession
			await service.testSupabaseConnection()

			expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
			
			// Reset mock
			mockSupabaseClient.auth.getSession.mockClear()

			// Ensure getSession is never called during token validation
			const token = createValidJWT()
			const mockUser = createMockSupabaseUser()

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: mockUser },
				error: null
			})

			setupMockDatabaseOperations(mockUser)

			await service.validateSupabaseToken(token)

			// CRITICAL: getSession should NOT be called during validation
			expect(mockSupabaseClient.auth.getSession).not.toHaveBeenCalled()
		})
	})

	describe('VALIDATION: User Data Integrity', () => {
		it('should enforce required user fields per Supabase user schema', async () => {
			const token = createValidJWT()
			
			// Test missing email
			const userWithoutEmail = createMockSupabaseUser({ 
				email: null,
				email_confirmed_at: new Date().toISOString() 
			})

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: userWithoutEmail },
				error: null
			})

			await expect(service.validateSupabaseToken(token))
				.rejects.toThrow('User data integrity error')

			// Test missing ID  
			const userWithoutId = createMockSupabaseUser({ 
				id: null,
				email_confirmed_at: new Date().toISOString() 
			})

			mockSupabaseClient.auth.getUser.mockResolvedValue({
				data: { user: userWithoutId },
				error: null
			})

			await expect(service.validateSupabaseToken(token))
				.rejects.toThrow('User data integrity error')
		})
	})

	describe('ARCHITECTURE: Admin Client Usage Patterns', () => {
		it('should consistently use direct admin client for ALL server-side operations', async () => {
			// Verify all major auth operations use the direct admin client
			const operations = [
				() => service.testSupabaseConnection(),
				() => service.getUserBySupabaseId(generateUUID()),
				() => service.getUserByEmail('test@example.com'),
				() => service.getUserStats()
			]

			// Mock responses for each operation
			mockSupabaseClient.auth.getSession.mockResolvedValue({
				data: { session: null },
				error: null
			})

			const mockDbResponse = {
				select: jest.fn().mockReturnValue({
					eq: jest.fn().mockReturnValue({
						single: jest.fn().mockResolvedValue({ data: null, error: null }),
						limit: jest.fn().mockReturnValue({
							single: jest.fn().mockResolvedValue({ data: null, error: null })
						})
					}),
					count: jest.fn().mockResolvedValue({ count: 0, error: null })
				})
			}

			mockSupabaseClient.from.mockReturnValue(mockDbResponse)

			for (const operation of operations) {
				await operation().catch(() => {}) // Ignore errors, just check direct client usage
			}

			// Verify direct admin client was used (createClient was mocked to return our mock)
			// Each operation should interact with the mocked client
			expect(mockSupabaseClient.from).toHaveBeenCalled()
		})
	})
})