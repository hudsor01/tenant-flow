/**
 * v2.6 Phase 65: per-owner document taxonomy hook.
 *
 * Reads from the `document_categories` table (RLS-scoped to the
 * current authenticated user). Returns the seven defaults seeded at
 * signup plus any custom categories the owner adds via Phase 66's
 * settings UI. 5-min staleTime — categories change rarely.
 */

import { useQuery } from '@tanstack/react-query'
import {
	documentCategoryQueries,
	type DocumentCategoryRow
} from '#hooks/api/query-keys/document-category-keys'

export function useDocumentCategories(): {
	categories: DocumentCategoryRow[]
	isLoading: boolean
	isError: boolean
} {
	const { data, isLoading, isError } = useQuery(
		documentCategoryQueries.list()
	)
	return {
		categories: data ?? [],
		isLoading,
		isError
	}
}
