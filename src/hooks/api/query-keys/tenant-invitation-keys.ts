/**
 * Tenant Invitation Query Options
 * Split from tenant-keys.ts: invitation list and validation queries.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { PaginatedResponse, TenantInvitation } from '#types/api-contracts'
import type {
	InvitationData,
	PageState
} from '#components/auth/accept-invite/accept-invite-form-types'
import { tenantQueries } from './tenant-keys'

export class InvalidInviteError extends Error {
	state: PageState
	constructor(state: PageState, message?: string) {
		super(message ?? `Invitation ${state}`)
		this.state = state
	}
}

export const tenantInvitationQueries = {
	invitations: () => [...tenantQueries.all(), 'invitations'] as const,

	/**
	 * Tenant invitations list
	 * Uses tenant_invitations table directly via PostgREST
	 */
	list: () =>
		queryOptions({
			queryKey: tenantInvitationQueries.invitations(),
			queryFn: async (): Promise<PaginatedResponse<TenantInvitation>> => {
				const supabase = createClient()
				const { data, error, count } = await supabase
					.from('tenant_invitations')
					.select(
						'id, email, lease_id, unit_id, status, created_at, expires_at, accepted_at, leases(id, units(id, unit_number, properties(id, name)))',
						{ count: 'exact' }
					)
					.order('created_at', { ascending: false })

				if (error)
					handlePostgrestError(error, 'tenant_invitations')

				const total = count ?? 0

				type InvitationRow = {
					id: string
					email: string
					lease_id: string | null
					unit_id: string | null
					status: string
					created_at: string | null
					expires_at: string
					accepted_at: string | null
					leases: {
						id: string
						units: {
							id: string
							unit_number: string | null
							properties: {
								id: string
								name: string
							} | null
						} | null
					} | null
				}
				const invitations: TenantInvitation[] = (
					data as unknown as InvitationRow[]
				).map(row => ({
					id: row.id,
					email: row.email,
					first_name: null,
					last_name: null,
					unit_id: row.unit_id ?? row.leases?.units?.id ?? '',
					unit_number: row.leases?.units?.unit_number ?? '',
					property_name: row.leases?.units?.properties?.name ?? '',
					created_at: row.created_at ?? '',
					expires_at: row.expires_at,
					accepted_at: row.accepted_at,
					status: (row.status as TenantInvitation['status']) ?? 'sent'
				}))

				return {
					data: invitations,
					total,
					pagination: { page: 1, limit: total, total, totalPages: 1 }
				}
			},
			...QUERY_CACHE_TIMES.LIST
		}),

	/**
	 * Validate a tenant invitation code via Edge Function.
	 * Used by the accept-invite page (unauthenticated tenant flow).
	 */
	validate: (code: string | null) =>
		queryOptions({
			queryKey: [...tenantInvitationQueries.invitations(), 'validate', code],
			queryFn: async (): Promise<InvitationData> => {
				const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
				const response = await fetch(
					`${supabaseUrl}/functions/v1/tenant-invitation-validate`,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ code })
					}
				)

				if (!response.ok) {
					if (response.status === 404) {
						throw new InvalidInviteError(
							'invalid',
							'This invitation is invalid or has already been used.'
						)
					} else if (response.status === 410) {
						throw new InvalidInviteError('expired')
					}
					throw new InvalidInviteError('error')
				}

				const data = (await response.json()) as InvitationData

				if (!data.valid) {
					throw new InvalidInviteError('invalid')
				}

				return data
			},
			enabled: !!code,
			retry: false
		})
}
