/**
 * Auth API - Backend auth endpoints connection
 * Connects to backend auth controller at /auth/*
 */

import { apiClient } from '@/lib/api-client'
import type {
	User,
	LoginCredentials,
	RegisterCredentials,
	AuthResponse,
	RefreshTokenRequest
} from '@repo/shared'
import { z } from 'zod'

// Response schemas for validation
const AuthResponseSchema = z.object({
	user: z.object({
		id: z.string(),
		email: z.string().email(),
		user_metadata: z.record(z.string(), z.unknown()).optional()
	}),
	session: z
		.object({
			access_token: z.string(),
			refresh_token: z.string(),
			expires_in: z.number(),
			expires_at: z.number().optional()
		})
		.optional(),
	message: z.string().optional()
})

const UserProfileSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	user_metadata: z.record(z.string(), z.unknown()).optional(),
	app_metadata: z.record(z.string(), z.unknown()).optional(),
	created_at: z.string(),
	updated_at: z.string()
})

/**
 * Auth API functions - Direct backend calls
 * These connect to the backend auth controller endpoints
 */
export const authApi = {
	/**
	 * Get current user profile - GET /auth/me
	 */
	async getCurrentUser() {
		return apiClient.getValidated<User>(
			'/auth/me',
			UserProfileSchema,
			'UserProfile'
		)
	},

	/**
	 * Login user - POST /auth/login
	 */
	async login(credentials: LoginCredentials) {
		return apiClient.postValidated<AuthResponse>(
			'/auth/login',
			AuthResponseSchema,
			'AuthResponse',
			credentials as unknown as Record<string, unknown>
		)
	},

	/**
	 * Register new user - POST /auth/register
	 */
	async register(credentials: RegisterCredentials) {
		return apiClient.postValidated<AuthResponse>(
			'/auth/register',
			AuthResponseSchema,
			'AuthResponse',
			credentials as unknown as Record<string, unknown>
		)
	},

	/**
	 * Logout user - POST /auth/logout
	 */
	async logout() {
		return apiClient.postValidated<{ success: boolean; message: string }>(
			'/auth/logout',
			z.object({
				success: z.boolean(),
				message: z.string()
			}),
			'LogoutResponse'
		)
	},

	/**
	 * Refresh access token - POST /auth/refresh
	 */
	async refreshToken(refreshTokenData: RefreshTokenRequest) {
		return apiClient.postValidated<AuthResponse>(
			'/auth/refresh',
			AuthResponseSchema,
			'RefreshTokenResponse',
			refreshTokenData as unknown as Record<string, unknown>
		)
	}
}

/**
 * Query keys for React Query caching
 */
export const authKeys = {
	all: ['auth'] as const,
	user: () => [...authKeys.all, 'user'] as const,
	profile: () => [...authKeys.all, 'profile'] as const
}
