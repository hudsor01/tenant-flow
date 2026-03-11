/**
 * Template Definition Query Keys & Options
 *
 * Provides queryOptions factory for loading saved custom field definitions
 * from the document_template_definitions table.
 *
 * TanStack Query v5 patterns:
 * - queryOptions() for type-safe query configuration
 * - Query key factory for consistent cache management
 * - PostgREST direct via supabase-js (no apiRequest calls)
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'
import type { DynamicField } from '#app/(owner)/documents/templates/components/dynamic-form'

/**
 * Template definition query factory
 */
export const templateDefinitionQueries = {
	all: () => ['document-template-definitions'] as const,

	/**
	 * Fetch custom fields for a specific template key for the current user.
	 * Returns an empty array when no definition exists (maybeSingle returns null).
	 * Uses getCachedUser() inside queryFn (standard pattern).
	 */
	byTemplateKey: (templateKey: string) =>
		queryOptions({
			queryKey: [...templateDefinitionQueries.all(), templateKey],
			queryFn: async (): Promise<DynamicField[]> => {
				const user = await getCachedUser()
				if (!user) return []

				const supabase = createClient()
				const { data, error } = await supabase
					.from('document_template_definitions')
					.select('custom_fields')
					.eq('owner_user_id', user.id)
					.eq('template_key', templateKey)
					.maybeSingle()

				if (error) handlePostgrestError(error, 'document_template_definitions')

				return (data?.custom_fields ?? []) as DynamicField[]
			},
			enabled: !!templateKey,
			...QUERY_CACHE_TIMES.DETAIL
		})
}
