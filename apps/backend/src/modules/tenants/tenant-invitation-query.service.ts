/**
 * Tenant Invitation Query Service
 * Handles invitation listing and status computation
 * Extracted from TenantQueryService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

/** Default limit for invitation queries */
const DEFAULT_INVITATION_LIMIT = 25

/** Maximum allowed pagination limit */
const MAX_LIMIT = 100

export interface TenantInvitation {
	id: string
	email: string
	unit_id: string | null
	unit_number: string
	property_name: string
	created_at: string
	expires_at: string
	accepted_at: string | null
	status: 'sent' | 'accepted' | 'expired'
}

/**
 * Raw invitation data shape from Supabase query with nested relations
 */
interface RawInvitationRow {
	id: string
	email: string
	unit_id: string | null
	property_owner_id: string
	created_at: string
	expires_at: string
	accepted_at: string | null
	status: string | null
	unit: {
		unit_number: string
		property: {
			name: string
		}
	} | null
}

export interface InvitationFilters {
	status?: 'sent' | 'accepted' | 'expired' | 'cancelled'
	page?: number
	limit?: number
}

@Injectable()
export class TenantInvitationQueryService {

	constructor(private readonly supabase: SupabaseService, private readonly logger: AppLogger) {}

	/**
	 * Get paginated tenant invitations for an owner
	 */
	async getInvitations(
		userId: string,
		filters?: InvitationFilters
	): Promise<{ data: TenantInvitation[]; total: number }> {
		if (!userId) {
			throw new BadRequestException('user_id is required')
		}

		const page = filters?.page || 1
		const limit = Math.min(filters?.limit || DEFAULT_INVITATION_LIMIT, MAX_LIMIT)
		const offset = (page - 1) * limit

		try {
			const client = this.supabase.getAdminClient()

			// tenant_invitations now has owner_user_id directly, no need to query property_owners

			// Build the query
			let query = client
				.from('tenant_invitations')
				.select(
					`
					id,
					email,
					unit_id,
					property_owner_id,
					created_at,
					expires_at,
					accepted_at,
					status,
					unit:units!inner(
						unit_number,
						property:properties!inner(name)
					)
				`,
					{ count: 'exact' }
				)
				.eq('owner_user_id', userId)
				.order('created_at', { ascending: false })

			// Apply status filter
			if (filters?.status) {
				if (filters.status === 'expired') {
					// Expired = not accepted and past expiry date
					query = query
						.is('accepted_at', null)
						.lt('expires_at', new Date().toISOString())
				} else if (filters.status === 'sent') {
					// Sent = not accepted and not expired
					query = query
						.is('accepted_at', null)
						.gte('expires_at', new Date().toISOString())
				} else if (filters.status === 'accepted') {
					query = query.not('accepted_at', 'is', null)
				}
			}

			// Apply pagination
			const { data, count, error } = await query.range(
				offset,
				offset + limit - 1
			)

			if (error) {
				this.logger.error('Failed to fetch invitations', {
					error: error.message
				})
				throw new BadRequestException('Failed to fetch invitations')
			}

			// Transform the data to flatten nested relations
			const rawData = data as unknown as RawInvitationRow[]
			const invitations: TenantInvitation[] = (rawData || []).map((inv) => ({
				id: inv.id,
				email: inv.email,
				unit_id: inv.unit_id,
				unit_number: inv.unit?.unit_number ?? '',
				property_name: inv.unit?.property?.name ?? '',
				created_at: inv.created_at,
				expires_at: inv.expires_at,
				accepted_at: inv.accepted_at,
				status: this.computeInvitationStatus(inv)
			}))

			return {
				data: invitations,
				total: count || 0
			}
		} catch (error) {
			if (error instanceof BadRequestException) throw error
			this.logger.error('Error fetching invitations', {
				error: error instanceof Error ? error.message : String(error)
			})
			throw new BadRequestException('Failed to fetch invitations')
		}
	}

	/**
	 * Compute the display status of an invitation
	 */
	computeInvitationStatus(invitation: {
		accepted_at: string | null
		expires_at: string
	}): 'sent' | 'accepted' | 'expired' {
		if (invitation.accepted_at) return 'accepted'
		if (new Date(invitation.expires_at) < new Date()) return 'expired'
		return 'sent'
	}
}