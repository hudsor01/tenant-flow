/**
 * Utility Service - Direct Supabase Implementation
 *
 * Handles utility functions and global search operations
 */

import { Inject, Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import type { Cache } from 'cache-manager'
import { v4 as uuidv4 } from 'uuid'
import type { SearchResult } from '@repo/shared/types/search'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import {
	buildILikePattern,
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../utils/sql-safe.utils'
import { querySingle, queryMutation } from '../utils/query-helpers'

export interface PasswordValidationResult {
	isValid: boolean
	score: number
	feedback: string[]
	requirements: {
		minLength: boolean
		hasUppercase: boolean
		hasLowercase: boolean
		hasNumbers: boolean
		hasSpecialChars: boolean
	}
}

@Injectable()
export class UtilityService {
	private readonly logger = new Logger(UtilityService.name)

	constructor(
		private readonly supabase: SupabaseService,
		@Inject(CACHE_MANAGER) private readonly cacheManager: Cache
	) {}

	/**
	 * Global search by name - replaces search_by_name function
	 * Uses direct Supabase queries
	 */
	async searchByName(
		userId: string,
		searchTerm: string,
		limit = 20
	): Promise<SearchResult[]> {
		try {
			this.logger.log('Performing global search via Supabase', {
				userId,
				searchTerm,
				limit
			})

			if (!searchTerm || searchTerm.trim().length < 2) {
				return []
			}

			// ✅ SECURITY FIX: Sanitize search input to prevent SQL injection
			const sanitized = sanitizeSearchInput(searchTerm)
			if (!sanitized) {
				return []
			}

			const searchLimit = Math.min(limit, 50)
			const client = this.supabase.getAdminClient()

			// ✅ SECURITY FIX: Use safe search pattern building
			const pattern = buildILikePattern(sanitized)

			// Search across all entity types in parallel
			const [propertiesResult, tenantsResult, unitsResult, leasesResult] =
				await Promise.all([
					client
						.from('property')
						.select('id, name, address, city, state, propertyType')
						.eq('userId', userId)
						.or(
							// ✅ SAFE: Uses sanitized pattern
							buildMultiColumnSearch(sanitized, ['name', 'address', 'city'])
						)
						.limit(searchLimit),
					client
						.from('tenant')
						.select('id, email, firstName, lastName, phone')
						.eq('userId', userId)
						.or(
							// ✅ SAFE: Uses sanitized pattern
							buildMultiColumnSearch(sanitized, ['email', 'firstName', 'lastName'])
						)
						.limit(searchLimit),
					client
						.from('unit')
						.select(
							'id, unitNumber, bedrooms, bathrooms, rent, status, propertyId'
						)
						.eq('userId', userId)
						// ✅ SAFE: Uses sanitized pattern
						.ilike('unitNumber', pattern)
						.limit(searchLimit),
					client
						.from('lease')
						.select(
							'id, rentAmount, startDate, endDate, status, tenantId, unitId'
						)
						.eq('userId', userId)
						.limit(searchLimit)
				])

			const properties = propertiesResult.data || []
			const tenants = tenantsResult.data || []
			const units = unitsResult.data || []
			const leases = leasesResult.data || []

			// Transform results to unified search format
			const results: SearchResult[] = []

			// Add property results
			properties.forEach(property => {
				results.push({
					id: property.id,
					type: 'property',
					name: property.name,
					description: `${property.address}, ${property.city}, ${property.state}`,
					metadata: {
						propertyType: property.propertyType,
						address: property.address,
						city: property.city,
						state: property.state
					}
				})
			})

			// Add tenant results
			tenants.forEach(tenant => {
				const fullName =
					tenant.firstName && tenant.lastName
						? `${tenant.firstName} ${tenant.lastName}`
						: tenant.email
				results.push({
					id: tenant.id,
					type: 'tenant',
					name: fullName,
					description: `Email: ${tenant.email}`,
					metadata: {
						email: tenant.email,
						firstName: tenant.firstName,
						lastName: tenant.lastName,
						phone: tenant.phone
					}
				})
			})

			// Add unit results
			units.forEach(unit => {
				results.push({
					id: unit.id,
					type: 'unit',
					name: `Unit ${unit.unitNumber}`,
					description: `${unit.bedrooms}BR/${unit.bathrooms}BA - $${unit.rent}/month`,
					metadata: {
						unitNumber: unit.unitNumber,
						bedrooms: unit.bedrooms,
						bathrooms: unit.bathrooms,
						rent: unit.rent,
						status: unit.status,
						propertyId: unit.propertyId
					}
				})
			})

			// Add lease results
			leases.forEach(lease => {
				results.push({
					id: lease.id,
					type: 'lease',
					name: `Lease ${lease.id.substring(0, 8)}`,
					description: `$${lease.rentAmount}/month - ${lease.status}`,
					metadata: {
						rentAmount: lease.rentAmount,
						startDate: lease.startDate,
						endDate: lease.endDate,
						status: lease.status,
						tenantId: lease.tenantId,
						unitId: lease.unitId
					}
				})
			})

			// Sort results by relevance (exact matches first, then partial matches)
			const sortedResults = results.sort((a, b) => {
				const aExact = a.name.toLowerCase() === sanitized.toLowerCase()
				const bExact = b.name.toLowerCase() === sanitized.toLowerCase()

				if (aExact && !bExact) return -1
				if (!aExact && bExact) return 1

				// Then sort by name similarity
				return (
					a.name.toLowerCase().indexOf(sanitized.toLowerCase()) -
					b.name.toLowerCase().indexOf(sanitized.toLowerCase())
				)
			})

			// Return limited results
			return sortedResults.slice(0, limit)
		} catch (error) {
			this.logger.error('Failed to perform global search', {
				error: error instanceof Error ? error.message : String(error),
				userId,
				searchTerm,
				limit
			})
			return []
		}
	}

	/**
	 * Map Supabase Auth ID to internal users.id
	 * Cached for 5 minutes to reduce database lookups
	 * 
	 * @param supabaseId - Supabase Auth UID from JWT token
	 * @returns Internal users.id for RLS policies
	 */
	async getUserIdFromSupabaseId(supabaseId: string): Promise<string> {
		const cacheKey = `user:supabaseId:${supabaseId}`
		const cached = await this.cacheManager.get<string>(cacheKey)
		if (cached) return cached

		const data = await querySingle<{ id: string }>(
			this.supabase
				.getAdminClient()
				.from('users')
				.select('id')
				.eq('supabaseId', supabaseId)
				.single(),
			{
				resource: 'user',
				id: supabaseId,
				operation: 'lookup by Supabase ID',
				logger: this.logger
			}
		)

		await this.cacheManager.set(cacheKey, data.id, 1800) // 30 min cache (reduced DB lookups for auth)
		return data.id
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
	async ensureUserExists(authUser: {
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
			role?: string
			[key: string]: unknown
		}
	}, retryCount = 0): Promise<string> {
		try {
			// First try to get existing user
			return await this.getUserIdFromSupabaseId(authUser.id)
		} catch (error) {
			// User doesn't exist - create them
			if (error instanceof NotFoundException) {
				this.logger.log('Creating new user record for OAuth user', {
					supabaseId: authUser.id,
					email: authUser.email
				})

				// Extract name from user metadata (OAuth providers)
				const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name
				const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture

				// Determine user role - default to OWNER for new sign-ups
				const role = authUser.app_metadata?.role === 'TENANT' ? 'TENANT' : 'OWNER'

				try {
					const data = await queryMutation<{ id: string }>(
						this.supabase
							.getAdminClient()
							.from('users')
							.insert({
								id: uuidv4(),
								supabaseId: authUser.id,
								email: authUser.email,
								name: fullName || null,
								avatarUrl: avatarUrl || null,
								role: role as Database['public']['Enums']['UserRole'],
								profileComplete: false,
								subscription_status: 'trialing' // New users start with trial
							})
							.select('id')
							.single(),
						{
							resource: 'user',
							operation: 'create for OAuth',
							logger: this.logger
						}
					)

					this.logger.log('User record created successfully', {
						userId: data.id,
						supabaseId: authUser.id,
						email: authUser.email,
						role
					})

					// Cache the new user ID
					const cacheKey = `user:supabaseId:${authUser.id}`
					await this.cacheManager.set(cacheKey, data.id, 1800) // 30 min cache (reduced DB lookups for auth)

					return data.id
				} catch (insertError: any) {
					// Check if it's a unique constraint violation (race condition)
					// ConflictException (409) from queryMutation for duplicate key
					if (insertError?.status === 409 || insertError?.message?.includes('duplicate')) {
						// Prevent infinite retry loops
						if (retryCount >= 1) {
							this.logger.error('Max retries exceeded for user creation race condition', {
								supabaseId: authUser.id,
								email: authUser.email,
								retryCount
							})
							throw new InternalServerErrorException('Failed to create user account after retry')
						}

						this.logger.warn('User creation race condition detected, retrying lookup', {
							supabaseId: authUser.id,
							email: authUser.email,
							retryCount
						})
						// Another request created the user, retry the lookup with incremented counter
						return await this.ensureUserExists(authUser, retryCount + 1)
					}

					this.logger.error('Failed to create user record', {
						error: insertError.message || insertError,
						supabaseId: authUser.id,
						email: authUser.email
					})
					throw new InternalServerErrorException('Failed to create user account')
				}
			}

			// Re-throw if it's not a NotFoundException
			throw error
		}
	}

	/**
	 * Validate password strength - replaces validate_password_strength function
	 * Uses native JavaScript instead of database function
	 */
	validatePasswordStrength(password: string): PasswordValidationResult {
		try {
			this.logger.debug('Validating password strength')

			if (!password) {
				return {
					isValid: false,
					score: 0,
					feedback: ['Password is required'],
					requirements: {
						minLength: false,
						hasUppercase: false,
						hasLowercase: false,
						hasNumbers: false,
						hasSpecialChars: false
					}
				}
			}

			// Check requirements
			const requirements = {
				minLength: password.length >= 8,
				hasUppercase: /[A-Z]/.test(password),
				hasLowercase: /[a-z]/.test(password),
				hasNumbers: /\d/.test(password),
				hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
			} // Calculate score (0-100)
			let score = 0
			if (requirements.minLength) score += 20
			if (requirements.hasUppercase) score += 20
			if (requirements.hasLowercase) score += 20
			if (requirements.hasNumbers) score += 20
			if (requirements.hasSpecialChars) score += 20

			// Bonus points for length
			if (password.length >= 12) score += 10
			if (password.length >= 16) score += 10

			// Penalty for common patterns
			if (/(.)\1{2,}/.test(password)) score -= 10 // Repeated characters
			if (/123|abc|qwe|password|admin/i.test(password)) score -= 20 // Common patterns

			// Ensure score stays within bounds
			score = Math.max(0, Math.min(100, score))

			// Generate feedback
			const feedback: string[] = []
			if (!requirements.minLength)
				feedback.push('Password must be at least 8 characters long')
			if (!requirements.hasUppercase)
				feedback.push('Password must contain at least one uppercase letter')
			if (!requirements.hasLowercase)
				feedback.push('Password must contain at least one lowercase letter')
			if (!requirements.hasNumbers)
				feedback.push('Password must contain at least one number')
			if (!requirements.hasSpecialChars)
				feedback.push('Password must contain at least one special character')

			if (password.length < 12)
				feedback.push('Consider using a longer password (12+ characters)')
			if (/(.)\1{2,}/.test(password))
				feedback.push('Avoid repeating the same character multiple times')
			if (/123|abc|qwe|password|admin/i.test(password))
				feedback.push('Avoid common patterns and words')

			// Determine if password is valid (meets basic requirements)
			const isValid = Object.values(requirements).every(req => req)

			return {
				isValid,
				score,
				feedback:
					feedback.length > 0 ? feedback : ['Password meets all requirements'],
				requirements
			}
		} catch (error) {
			this.logger.error('Failed to validate password strength', {
				error: error instanceof Error ? error.message : String(error)
			})

			return {
				isValid: false,
				score: 0,
				feedback: ['Error validating password'],
				requirements: {
					minLength: false,
					hasUppercase: false,
					hasLowercase: false,
					hasNumbers: false,
					hasSpecialChars: false
				}
			}
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
			this.logger.error('Utility service health check failed:', error)
			return false
		}
	}
}
