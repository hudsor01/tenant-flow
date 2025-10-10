import type { TenantWithLeaseInfo } from '@repo/shared/types/relations'
import { createSupabaseClient } from './supabase-client'

/**
 * Shape returned by tenant queries.
 */
export type TenantListResponse = TenantWithLeaseInfo[]

/**
 * Example abstraction around tenant queries. This keeps data-fetching logic
 * co-located for reuse across applications.
 */
export async function fetchTenants() {
	const client = createSupabaseClient()
	const { data, error } = await client.from('tenants_with_lease_info').select('*')
	if (error) {
		throw error
	}

	return (data ?? []) as TenantListResponse
}
