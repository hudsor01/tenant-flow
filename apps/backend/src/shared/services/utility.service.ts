/**
 * Utility Service - User Management
 *
 * Handles user ID mapping and user account management.
 * Search and password validation extracted to separate services.
 */

import {
	Injectable,
	NotFoundException,
	InternalServerErrorException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { USER_user_type } from '@repo/shared/constants/auth'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import { RedisCacheService } from '../../cache/cache.service'

const VALID_USER_TYPES = Object.values(USER_user_type) as string[]
const SAFE_DEFAULT_SIGNUP_USER_TYPE: string = 'OWNER'

function isValidUserType(userType: unknown): userType is string {
	return typeof userType === 'string' && VALID_USER_TYPES.includes(userType)
}

@Injectable()
export class UtilityService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger,
		private readonly cache: RedisCacheService
	) {}

	/**
	 * Map Supabase Auth ID to internal users.id
	 * Cached for 5 minutes to reduce database lookups
	 *
	 * @param supabaseId - Supabase Auth UID from JWT token
	 * @returns Internal users.id for RLS policies
	 */
	async getUserIdFromSupabaseId(supabaseId: string): Promise<string> {
		const cacheKey = `user:supabaseId:${supabaseId}`
		const cached = await this.cache.get<string>(cacheKey)
		if (cached) return cached

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('id')
			.eq('id', supabaseId)
			.single()

		// Handle database errors separately from missing user
		if (error) {
			this.logger.error('Database error during user ID lookup', {
				error: error.message || error,
				supabaseId
			})
			throw new InternalServerErrorException(
				'Failed to lookup user information'
			)
		}

		if (!data) {
			this.logger.error('User not found in database', { supabaseId })
			throw new NotFoundException('User not found')
		}

		await this.cache.set(cacheKey, data.id, { tier: 'long' })
		return data.id
	}

	async getUserTypeByUserId(userId: string): Promise<string | null> {
		const cacheKey = `user:user_type:${userId}`
		const cachedUserType = await this.cache.get<string>(cacheKey)
		if (cachedUserType) {
			return cachedUserType
		}

		const { data, error } = await this.supabase
			.getAdminClient()
			.from('users')
			.select('user_type')
			.eq('id', userId)
			.single()

		if (error) {
			this.logger.error('Failed to fetch user user_type', {
				error: error.message || error,
				userId
			})
			return null
		}

		if (!data?.user_type) {
			this.logger.warn('User user_type missing from database record', {
				userId
			})
			return null
		}

		await this.cache.set(cacheKey, data.user_type, { tier: 'long' })
		return data.user_type
	}

	/**
	 * Ensures a user exists in the users table for the given Supabase auth ID
	 * Creates the user if they don't exist (e.g., OAuth sign-ins)
	 * Returns the internal users.id
	 *
	 * This is the proper way to handle OAuth users who may not have a users table record yet
	 *
	 * @param authUser - User data from Supabase auth
	 * @param retryCount - Internal retry counter to prevent infinite loops (default: 0, max: 1)
	 */
	async ensureUserExists(
		authUser: {
			id: string
			email: string
			user_metadata?: {
				full_name?: string
				name?: string
				avatar_url?: string
				picture?: string
				[key: string]: unknown
			}
			app_metadata?: {
				user_type?: string
				[key: string]: unknown
			}
		},
		retryCount = 0
	): Promise<string> {
		// Try to get existing user first using atomic upsert
		try {
			return await this.getUserIdFromSupabaseId(authUser.id)
		} catch (error) {
			// User doesn't exist - proceed with atomic upsert to prevent race conditions
			if (
				error instanceof NotFoundException ||
				error instanceof InternalServerErrorException
			) {
				this.logger.log('Creating new user record for OAuth user', {
					supabaseId: authUser.id,
					email: authUser.email
				})

				// Extract name from user metadata (OAuth providers)
				const fullName =
					authUser.user_metadata?.full_name || authUser.user_metadata?.name
				const avatarUrl =
					authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture

				// Determine user user_type with safe defaults (never silently escalate to OWNER)
				const requestedUserType = authUser.app_metadata?.user_type
				let resolvedUserType: string = SAFE_DEFAULT_SIGNUP_USER_TYPE

				if (isValidUserType(requestedUserType)) {
					resolvedUserType = requestedUserType
				} else if (requestedUserType) {
					this.logger.warn(
						'Invalid user_type supplied in Supabase app_metadata during signup, defaulting to owner access',
						{
							supabaseId: authUser.id,
							email: authUser.email,
							requestedUserType
						}
					)
				} else {
					this.logger.debug(
						'No user_type supplied in Supabase app_metadata during signup, defaulting to owner access',
						{
							supabaseId: authUser.id,
							email: authUser.email
						}
					)
				}

				// Use atomic upsert to prevent race conditions
				const { data, error: upsertError } = await this.supabase
					.getAdminClient()
					.from('users')
					.upsert(
						{
							id: authUser.id,
							email: authUser.email,
							full_name: fullName || null,
							avatar_url: avatarUrl || null,
							user_type: resolvedUserType
						} as Database['public']['Tables']['users']['Insert'],
						{
							onConflict: 'id' // Use supabaseId as conflict key
						}
					)
					.select('id')
					.single()

				if (upsertError) {
					// Check if it's a constraint violation
					const errorCode = (upsertError as { code?: string }).code
					if (
						errorCode === '23505' ||
						upsertError.message?.includes('duplicate')
					) {
						// Race condition: another request created the user, retry lookup
						if (retryCount >= 2) {
							// Increase max retries slightly
							this.logger.error(
								'Max retries exceeded for user creation race condition',
								{
									supabaseId: authUser.id,
									email: authUser.email,
									retryCount
								}
							)
							throw new InternalServerErrorException(
								'Failed to create user account after retry'
							)
						}

						this.logger.warn(
							'User creation race condition detected, retrying lookup',
							{
								supabaseId: authUser.id,
								email: authUser.email,
								retryCount
							}
						)
						// Wait briefly to allow database consistency before retrying
						await new Promise(resolve =>
							setTimeout(resolve, 100 * (retryCount + 1))
						)
						return await this.ensureUserExists(authUser, retryCount + 1)
					}

					this.logger.error('Failed to create user record', {
						error: upsertError.message || upsertError,
						supabaseId: authUser.id,
						email: authUser.email
					})
					throw new InternalServerErrorException(
						'Failed to create user account'
					)
				}

				if (!data) {
					this.logger.error('No data returned from user upsert', {
						supabaseId: authUser.id
					})
					throw new InternalServerErrorException(
						'Failed to create user account'
					)
				}

				this.logger.log('User record created/updated successfully', {
					user_id: data.id,
					supabaseId: authUser.id,
					email: authUser.email,
					user_type: resolvedUserType
				})

				// Cache the new user ID
				const cacheKey = `user:supabaseId:${authUser.id}`
				await this.cache.set(cacheKey, data.id, { tier: 'long' })

				return data.id
			}

			// Re-throw if it's not a NotFoundException
			throw error
		}
	}

	/**
	 * Health check for utility service
	 */
	async isHealthy(): Promise<boolean> {
		try {
			// Basic health check - verify Supabase service is available
			return !!this.supabase.getAdminClient()
		} catch (error) {
			this.logger.error('Utility service health check failed:', { error })
			return false
		}
	}
}
