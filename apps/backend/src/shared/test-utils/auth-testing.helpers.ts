/**
 * Authentication Testing Helpers
 *
 * Provides utilities for testing Supabase authentication in NestJS controllers and services.
 * Follows the official Supabase authentication testing patterns.
 */

import type { TestingModuleBuilder } from '@nestjs/testing'
import type { User } from '@supabase/supabase-js'

import { SupabaseService } from '../../database/supabase.service'
import {
	createMockSupabaseService,
	createMockUser
} from '../../test-utils/mocks'

/**
 * Authentication test context for controller/service testing
 */
export interface AuthTestContext {
	supabaseService: ReturnType<typeof createMockSupabaseService>
	user: User
	authenticatedRequest: { [key: string]: unknown }
	unauthenticatedRequest: { [key: string]: unknown }
}

/**
 * Set up authentication mocks for testing modules
 */
export function setupAuthTesting(
	builder: TestingModuleBuilder,
	options?: {
		mockUser?: Partial<User>
		includeCurrentUserProvider?: boolean
	}
): TestingModuleBuilder {
	const mockSupabaseService = createMockSupabaseService()
	const mockUser = createMockUser(options?.mockUser)

	// Mock the SupabaseService to return our controlled mock
	builder.overrideProvider(SupabaseService).useValue(mockSupabaseService)

	if (options?.includeCurrentUserProvider) {
		builder.overrideProvider('CurrentUserProvider').useValue({
			getUserId: jest.fn().mockResolvedValue(mockUser.id),
			getUser: jest.fn().mockResolvedValue(mockUser),
			getUserEmail: jest.fn().mockResolvedValue(mockUser.email),
			isAuthenticated: jest.fn().mockResolvedValue(true),
			getUserOrNull: jest.fn().mockResolvedValue(mockUser)
		})
	}

	return builder
}

/**
 * Create an authenticated request mock
 */
export function createAuthenticatedRequest(
	user: User = createMockUser(),
	overrides?: { [key: string]: unknown }
) {
	return {
		user,
		headers: {
			authorization: 'Bearer mock-jwt-token',
			...(overrides?.headers ?? {})
		},
		...overrides
	}
}

/**
 * Create an unauthenticated request mock
 */
export function createUnauthenticatedRequest(overrides?: {
	[key: string]: unknown
}) {
	return {
		user: null,
		headers: {
			...(overrides?.headers ?? {})
		},
		...overrides
	}
}

/**
 * Setup complete authentication context for testing
 */
export function createAuthTestContext(user?: Partial<User>): AuthTestContext {
	const mockUser = createMockUser(user)
	const mockSupabaseService = createMockSupabaseService({
		getUser: jest.fn().mockResolvedValue(mockUser)
	})

	return {
		supabaseService: mockSupabaseService,
		user: mockUser,
		authenticatedRequest: createAuthenticatedRequest(mockUser),
		unauthenticatedRequest: createUnauthenticatedRequest()
	}
}

/**
 * Helper for testing JWT claim-based authentication
 */
export function setupJwtClaims(context: AuthTestContext) {
	// Mock JWT claims for RLS testing
	context.supabaseService.getUser.mockImplementation(
		async (req: { user?: unknown }) => {
			if (req.user) {
				return req.user as User
			}
			// Simulate extracting user from request context for RLS
			return context.user
		}
	)

	return context
}

/**
 * Test helper for authentication guard scenarios
 */
export function expectAuthFailure(
	result: Promise<unknown>,
	expectedError?: string | RegExp | Error
) {
	return expect(result).rejects.toThrow(expectedError || 'Unauthorized')
}

/**
 * Test helper for successful authentication scenarios
 */
export function expectAuthSuccess<T>(
	result: Promise<T>,
	expectedData?: Partial<T>
) {
	return expect(result).resolves.toMatchObject(expectedData || {})
}

/**
 * Helper to create mock JWT tokens for testing
 */
export function createMockJwtToken(
	userId: string = 'user-123',
	overrides?: { [key: string]: unknown }
) {
	const header = Buffer.from(
		JSON.stringify({ alg: 'ES256', typ: 'JWT' })
	).toString('base64')
	const payload = Buffer.from(
		JSON.stringify({
			sub: userId,
			role: 'authenticated',
			email: 'test@example.com',
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(Date.now() / 1000) + 3600,
			...overrides
		})
	).toString('base64')
	const signature = Buffer.from('mock-signature').toString('base64')

	return `${header}.${payload}.${signature}`
}

/**
 * Supabase Auth session mock for testing authenticated flows
 */
export function createMockAuthSession(
	user: User = createMockUser(),
	overrides?: { [key: string]: unknown }
) {
	return {
		access_token: createMockJwtToken(user.id),
		refresh_token: 'mock-refresh-token',
		expires_in: 3600,
		token_type: 'bearer',
		user,
		...overrides
	}
}

/**
 * Helper for testing RLS policies with specific user contexts
 */
export function withAuthContext<T>(
	context: AuthTestContext,
	testFn: (ctx: AuthTestContext) => Promise<T>
): Promise<T> {
	// Set up the authentication context
	context.supabaseService.getUser.mockResolvedValue(context.user)

	return testFn(context)
}

/**
 * Helper for testing anonymous/unauthenticated scenarios
 */
export function withAnonymousContext<T>(
	context: AuthTestContext,
	testFn: (ctx: AuthTestContext) => Promise<T>
): Promise<T> {
	// Set up anonymous context
	context.supabaseService.getUser.mockResolvedValue(null)

	return testFn(context)
}
