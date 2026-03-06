/**
 * Tenant Portal Query Keys
 * Shared query key factory for all tenant portal hooks.
 * Extracted to avoid circular dependencies between split modules.
 *
 * Also provides shared tenantIdQuery and resolveTenantId() for
 * deduplicating tenant ID resolution across all tenant portal hooks.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'

export const tenantPortalKeys = {
	all: ['tenant-portal'] as const,
	dashboard: () => [...tenantPortalKeys.all, 'dashboard'] as const,
	amountDue: () => [...tenantPortalKeys.all, 'amount-due'] as const,
	payments: {
		all: () => [...tenantPortalKeys.all, 'payments'] as const
	},
	autopay: {
		all: () => [...tenantPortalKeys.all, 'autopay'] as const,
		status: () => [...tenantPortalKeys.all, 'autopay'] as const
	},
	maintenance: {
		all: () => [...tenantPortalKeys.all, 'maintenance'] as const,
		list: () => [...tenantPortalKeys.all, 'maintenance'] as const
	},
	leases: {
		all: () => [...tenantPortalKeys.all, 'lease'] as const
	},
	documents: {
		all: () => [...tenantPortalKeys.all, 'documents'] as const
	},
	settings: {
		all: () => [...tenantPortalKeys.all, 'settings'] as const
	},
	notificationPreferences: {
		all: () => [...tenantPortalKeys.all, 'notification-preferences'] as const,
		detail: () => [...tenantPortalKeys.all, 'notification-preferences', 'detail'] as const
	}
}

/**
 * Shared tenantIdQuery — caches the tenant ID for 10 minutes.
 * Used as a hook-level dependency (useQuery(tenantIdQuery())).
 */
export const tenantIdQuery = () =>
	queryOptions({
		queryKey: [...tenantPortalKeys.all, 'tenant-id'],
		queryFn: async (): Promise<string | null> => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')
			const { data } = await supabase
				.from('tenants')
				.select('id')
				.eq('user_id', user.id)
				.single()
			return data?.id ?? null
		},
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	})

/**
 * Resolve tenant ID for use inside other queryFns.
 * TanStack Query handles deduplication at the query level.
 * Each queryFn that calls this gets the tenant ID with a single DB call
 * (or from TanStack Query cache if another query already resolved it).
 */
export async function resolveTenantId(): Promise<string | null> {
	const supabase = createClient()
	const user = await getCachedUser()
	if (!user) return null
	const { data } = await supabase
		.from('tenants')
		.select('id')
		.eq('user_id', user.id)
		.single()
	return data?.id ?? null
}
