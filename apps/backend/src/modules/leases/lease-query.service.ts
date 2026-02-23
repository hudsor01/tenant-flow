/**
 * Lease Query Service
 *
 * Handles all lease query operations:
 * - findAll: Get all leases with filtering and pagination
 * - findOne: Get single lease by ID
 * - getLeaseDataForPdf: Get complete lease data for PDF generation
 *
 * Extracted from LeasesService to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Injectable,
	NotFoundException
} from '@nestjs/common'
import type {
	Lease,
	LeaseStatus,
	Property,
	Unit,
	User,
	Tenant
} from '@repo/shared/types/core'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'
import {
	buildMultiColumnSearch,
	sanitizeSearchInput
} from '../../shared/utils/sql-safe.utils'

@Injectable()
export class LeaseQueryService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get all leases for a user with search and filters
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async findAll(
		token: string,
		query: {
			tenant_id?: string | undefined
			unit_id?: string | undefined
			property_id?: string | undefined
			status?: string | undefined
			start_date?: string | undefined
			end_date?: string | undefined
			search?: string | undefined
			limit?: number | undefined
			offset?: number | undefined
			sortBy?: string | undefined
			sortOrder?: string | undefined
		}
	): Promise<{ data: Lease[]; total: number; limit: number; offset: number }> {
		try {
			if (!token) {
				this.logger.warn('Find all leases requested without token')
				throw new BadRequestException('Authentication token is required')
			}

			this.logger.log('Finding all leases via RLS-protected query', {
				query
			})

			// RLS SECURITY: User-scoped client automatically filters to user's leases
			const client = this.supabase.getUserClient(token)

			// Build single query with both data and count (NO manual user_id/unit_id filtering needed)
			let queryBuilder = client.from('leases').select('id, unit_id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency, security_deposit, payment_day, lease_status, stripe_subscription_id, stripe_connected_account_id, stripe_subscription_status, auto_pay_enabled, grace_period_days, late_fee_amount, late_fee_days, pets_allowed, pet_deposit, pet_rent, max_occupants, utilities_included, tenant_responsible_utilities, property_rules, governing_state, property_built_before_1978, lead_paint_disclosure_acknowledged, owner_signed_at, owner_signature_ip, owner_signature_method, tenant_signed_at, tenant_signature_ip, tenant_signature_method, sent_for_signature_at, docuseal_submission_id, subscription_failure_reason, subscription_last_attempt_at, subscription_retry_count, created_at, updated_at', { count: 'exact' })

			// Apply filters
			if (query.property_id) {
				queryBuilder = queryBuilder.eq('property_id', String(query.property_id))
			}
			if (query.tenant_id) {
				queryBuilder = queryBuilder.eq(
					'primary_tenant_id',
					String(query.tenant_id)
				)
			}
			if (query.status) {
				queryBuilder = queryBuilder.eq(
					'lease_status',
					query.status as LeaseStatus
				)
			}
			if (query.start_date) {
				queryBuilder = queryBuilder.gte(
					'start_date',
					new Date(query.start_date as string).toISOString()
				)
			}
			if (query.end_date) {
				queryBuilder = queryBuilder.lte(
					'end_date',
					new Date(query.end_date as string).toISOString()
				)
			}
			// SECURITY FIX #2: Use safe search to prevent SQL injection
			if (query.search) {
				const sanitized = sanitizeSearchInput(String(query.search))
				if (sanitized) {
					queryBuilder = queryBuilder.or(
						buildMultiColumnSearch(sanitized, ['primary_tenant_id', 'unit_id'])
					)
				}
			}

			// Apply pagination
			const limit = query.limit ? Number(query.limit) : 50
			const offset = query.offset ? Number(query.offset) : 0
			queryBuilder = queryBuilder.range(offset, offset + limit - 1)

			// Apply sorting
			const sortBy = query.sortBy || 'created_at'
			const sortOrder = query.sortOrder || 'desc'
			queryBuilder = queryBuilder.order(sortBy as string, {
				ascending: sortOrder === 'asc'
			})

			const { data, count, error } = await queryBuilder

			if (error) {
				this.logger.error('Failed to fetch leases from Supabase', {
					error: error.message,
					query
				})
				throw new BadRequestException('Failed to fetch leases')
			}

			return {
				data: data as Lease[],
				total: count ?? 0,
				limit,
				offset
			}
		} catch (error) {
			this.logger.error('Leases service failed to find all leases', {
				error: error instanceof Error ? error.message : String(error),
				query
			})
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Failed to fetch leases'
			)
		}
	}

	/**
	 * Find one lease by ID
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's leases
	 */
	async findOne(token: string, lease_id: string): Promise<Lease> {
		// FAIL FAST: Validate inputs immediately
		if (!token || !lease_id) {
			this.logger.warn('Find one lease called with missing parameters', {
				lease_id
			})
			throw new BadRequestException(
				'Authentication token and lease ID are required'
			)
		}

		this.logger.log('Finding one lease via RLS-protected query', {
			lease_id
		})

		// RLS SECURITY: User-scoped client automatically filters to user's leases
		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('leases')
			.select('id, unit_id, owner_user_id, primary_tenant_id, start_date, end_date, rent_amount, rent_currency, security_deposit, payment_day, lease_status, stripe_subscription_id, stripe_connected_account_id, stripe_subscription_status, auto_pay_enabled, grace_period_days, late_fee_amount, late_fee_days, pets_allowed, pet_deposit, pet_rent, max_occupants, utilities_included, tenant_responsible_utilities, property_rules, governing_state, property_built_before_1978, lead_paint_disclosure_acknowledged, owner_signed_at, owner_signature_ip, owner_signature_method, tenant_signed_at, tenant_signature_ip, tenant_signature_method, sent_for_signature_at, docuseal_submission_id, subscription_failure_reason, subscription_last_attempt_at, subscription_retry_count, created_at, updated_at')
			.eq('id', lease_id)
			.single()

		if (error) {
			this.logger.error('Failed to fetch lease from Supabase', {
				error: error.message,
				lease_id
			})
			throw new BadRequestException('Failed to fetch lease')
		}

		if (!data) {
			throw new NotFoundException(`Lease with ID ${lease_id} not found`)
		}

		return data as Lease
	}

	/**
	 * Get complete lease data required for PDF generation
	 * Includes lease, property, unit, landlord, tenant with all relations
	 */
	async getLeaseDataForPdf(
		token: string,
		leaseId: string
	): Promise<{
		lease: Lease
		property: Property
		unit: Unit
		landlord: User
		tenant: User
		tenantRecord: Tenant
	}> {
		// RLS SECURITY: User-scoped client automatically validates ownership
		const client = this.supabase.getUserClient(token)

		// Get lease with full relations in parallel for performance
		const { data: lease, error: leaseError } = await client
			.from('leases')
			.select(
				`
				*,
				unit:units!leases_unit_id_fkey (
					*,
					property:properties!units_property_id_fkey (*)
				),
				tenant:tenants!leases_primary_tenant_id_fkey (
					*,
					user:users!tenants_user_id_fkey (*)
				)
			`
			)
			.eq('id', leaseId)
			.single()

		if (leaseError || !lease) {
			throw new NotFoundException('Lease not found')
		}

		// Get landlord user (owner_user_id references auth.users.id)
		const { data: landlord, error: landlordError } = await client
			.from('users')
			.select('id, email, full_name, first_name, last_name, phone, avatar_url, status, user_type, stripe_customer_id, onboarding_status, onboarding_completed_at, identity_verification_status, identity_verification_session_id, identity_verified_at, identity_verification_data, identity_verification_error, created_at, updated_at')
			.eq('id', lease.owner_user_id)
			.single()

		if (landlordError || !landlord) {
			throw new NotFoundException('Landlord not found')
		}

		// Extract nested relations
		const unit = lease.unit as Unit & {
			property: Property
		}

		const tenantRecord =
			lease.tenant as Tenant & {
				user: User
			}

		if (!unit?.property) {
			throw new NotFoundException('Property not found for lease')
		}

		if (!tenantRecord?.user) {
			throw new NotFoundException('Tenant user not found')
		}

		return {
			lease,
			property: unit.property,
			unit,
			landlord,
			tenant: tenantRecord.user,
			tenantRecord
		}
	}
}
