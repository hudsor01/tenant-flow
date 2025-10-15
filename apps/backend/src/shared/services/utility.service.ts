/**
 * Utility Service - Direct Supabase Implementation
 *
 * Handles utility functions and global search operations
 */

import { Injectable, Logger } from '@nestjs/common'
import type { SearchResult } from '@repo/shared/types/search'
import { SupabaseService } from '../../database/supabase.service'

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

	constructor(private readonly supabase: SupabaseService) {}

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

			const trimmedSearch = searchTerm.trim().toLowerCase()
			const searchLimit = Math.min(limit, 50)
			const client = this.supabase.getAdminClient()

			// Search across all entity types in parallel
			const [propertiesResult, tenantsResult, unitsResult, leasesResult] =
				await Promise.all([
					client
						.from('property')
						.select('id, name, address, city, state, propertyType')
						.eq('userId', userId)
						.or(
							`name.ilike.%${trimmedSearch}%,address.ilike.%${trimmedSearch}%,city.ilike.%${trimmedSearch}%`
						)
						.limit(searchLimit),
					client
						.from('tenant')
						.select('id, email, firstName, lastName, phone')
						.eq('userId', userId)
						.or(
							`email.ilike.%${trimmedSearch}%,firstName.ilike.%${trimmedSearch}%,lastName.ilike.%${trimmedSearch}%`
						)
						.limit(searchLimit),
					client
						.from('unit')
						.select(
							'id, unitNumber, bedrooms, bathrooms, rent, status, propertyId'
						)
						.eq('userId', userId)
						.ilike('unitNumber', `%${trimmedSearch}%`)
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
				const aExact = a.name.toLowerCase() === trimmedSearch.toLowerCase()
				const bExact = b.name.toLowerCase() === trimmedSearch.toLowerCase()

				if (aExact && !bExact) return -1
				if (!aExact && bExact) return 1

				// Then sort by name similarity
				return (
					a.name.toLowerCase().indexOf(trimmedSearch.toLowerCase()) -
					b.name.toLowerCase().indexOf(trimmedSearch.toLowerCase())
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
