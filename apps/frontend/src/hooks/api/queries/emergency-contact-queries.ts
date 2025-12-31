/**
 * Emergency Contact Query Options
 *
 * TanStack Query options for emergency contact management.
 * Uses native fetch for NestJS calls.
 */

import { queryOptions } from '@tanstack/react-query'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import { apiRequest } from '#lib/api-request'

/**
 * Emergency contact types
 */
export interface EmergencyContact {
	id: string
	tenant_id: string
	contactName: string
	relationship: string
	phoneNumber: string
	email: string | null
	created_at: string
	updated_at: string
}

export interface CreateEmergencyContactInput {
	tenant_id: string
	contactName: string
	relationship: string
	phoneNumber: string
	email?: string | null
}

export interface UpdateEmergencyContactInput {
	contactName?: string
	relationship?: string
	phoneNumber?: string
	email?: string | null
}

/**
 * Emergency contact query factory
 */
export const emergencyContactQueries = {
	/**
	 * Base key for all emergency contact queries
	 */
	all: () => ['emergency-contacts'] as const,

	/**
	 * Emergency contact for a tenant
	 */
	contact: (tenant_id: string) =>
		queryOptions({
			queryKey: [...emergencyContactQueries.all(), tenant_id],
			queryFn: () =>
				apiRequest<EmergencyContact | null>(
					`/api/v1/tenants/${tenant_id}/emergency-contact`
				),
			enabled: !!tenant_id,
			...QUERY_CACHE_TIMES.DETAIL,
			retry: 2
		})
}

/**
 * Query keys for emergency contacts (for cache management in mutations)
 */
export const emergencyContactKeys = {
	all: ['emergency-contacts'] as const,
	tenant: (tenant_id: string) =>
		[...emergencyContactKeys.all, tenant_id] as const
}
