/**
 * Search Service
 *
 * Handles global search operations across all entity types.
 * Extracted from UtilityService for single responsibility.
 */

import { Injectable } from '@nestjs/common'
import type { SearchResult } from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildILikePattern,
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../utils/sql-safe.utils'

@Injectable()
export class SearchService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Global search by name across properties, tenants, units, and leases
	 * Uses direct Supabase queries with SQL injection protection
	 */
	async searchByName(
		user_id: string,
		searchTerm: string,
		limit = 20
	): Promise<SearchResult[]> {
		try {
			this.logger.log('Performing global search via Supabase', {
				user_id,
				searchTerm,
				limit
			})

			if (!searchTerm || searchTerm.trim().length < 2) {
				return []
			}

			// SECURITY FIX: Sanitize search input to prevent SQL injection
			const sanitized = sanitizeSearchInput(searchTerm)
			if (!sanitized) {
				return []
			}

			const searchLimit = Math.min(limit, 50)
			const client = this.supabase.getAdminClient()

			// SECURITY FIX: Use safe search pattern building
			const pattern = buildILikePattern(sanitized)

			// Search across all entity types in parallel
			const [propertiesResult, tenantsResult, unitsResult, leasesResult] =
				await Promise.all([
					client
						.from('properties')
						.select('id, name, address_line1, city, state, property_type')
						.eq('user_id', user_id)
						.or(
							// SAFE: Uses sanitized pattern
							buildMultiColumnSearch(sanitized, [
								'name',
								'address_line1',
								'city'
							])
						)
						.limit(searchLimit),
					client
						.from('tenants')
						.select('id, user_id, users!inner(email, first_name, last_name)')
						.eq('user_id', user_id)
						.or(
							// SAFE: Uses sanitized pattern
							buildMultiColumnSearch(sanitized, [
								'users.email',
								'users.first_name',
								'users.last_name'
							])
						)
						.limit(searchLimit),
					client
						.from('units')
						.select(
							'id, unit_number, bedrooms, bathrooms, rent_amount, status, property_id'
						)
						.eq('user_id', user_id)
						// SAFE: Uses sanitized pattern
						.ilike('unit_number', pattern)
						.limit(searchLimit),
					client
						.from('leases')
						.select(
							'id, rent_amount, start_date, end_date, lease_status, primary_tenant_id, unit_id'
						)
						.eq('user_id', user_id)
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
					type: 'properties',
					name: property.name,
					description: `${property.address_line1}, ${property.city}, ${property.state}`,
					metadata: {
						property_type: property.property_type,
						address_line1: property.address_line1,
						city: property.city,
						state: property.state
					}
				})
			})

			// Add tenant results
			tenants.forEach(tenant => {
				const fullName =
					tenant.users.first_name && tenant.users.last_name
						? `${tenant.users.first_name} ${tenant.users.last_name}`
						: tenant.users.email
				results.push({
					id: tenant.id,
					type: 'tenants',
					name: fullName,
					description: `Email: ${tenant.users.email}`,
					metadata: {
						email: tenant.users.email,
						first_name: tenant.users.first_name,
						last_name: tenant.users.last_name,
						phone: null // Phone is no longer stored on tenant
					}
				})
			})

			// Add unit results
			units.forEach(unit => {
				results.push({
					id: unit.id,
					type: 'units',
					name: `Unit ${unit.unit_number}`,
					description: `${unit.bedrooms}BR/${unit.bathrooms}BA - $${unit.rent_amount}/month`,
					metadata: {
						unit_number: unit.unit_number,
						bedrooms: unit.bedrooms,
						bathrooms: unit.bathrooms,
						rent: unit.rent_amount,
						status: unit.status,
						property_id: unit.property_id
					}
				})
			})

			// Add lease results
			leases.forEach(lease => {
				results.push({
					id: lease.id,
					type: 'leases',
					name: `Lease ${lease.id.substring(0, 8)}`,
					description: `$${lease.rent_amount}/month - ${lease.lease_status}`,
					metadata: {
						rent_amount: lease.rent_amount,
						start_date: lease.start_date,
						end_date: lease.end_date,
						status: lease.lease_status,
						tenant_id: lease.primary_tenant_id,
						unit_id: lease.unit_id
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
				user_id,
				searchTerm,
				limit
			})
			return []
		}
	}
}
