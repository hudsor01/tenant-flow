import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'

/**
 * Shape returned by tenant queries.
 */
export type TenantListResponse = TenantWithLeaseInfo[]

/**
 * Example abstraction around tenant queries. This keeps data-fetching logic
 * co-located for reuse across applications.
 */
export async function fetchTenants() {
	const client = getSupabaseClientInstance()
	// Use correct table name 'tenant' (singular) - query with lease relation
	const { data, error } = await client.from('tenant').select('*, lease(*)')
	if (error) {
		throw error
	}

	return (data ?? []) as unknown as TenantListResponse
}
