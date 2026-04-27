/**
 * Document Categories Query Keys (v2.6 Phase 65).
 *
 * Wraps the `document_categories` table — per-owner taxonomy that
 * replaced the compile-time DOCUMENT_CATEGORIES tuple. Existing
 * users were seeded with the seven v2.5 defaults at migration time;
 * new users get them via the `seed_default_categories_on_user_insert`
 * trigger.
 *
 * Categories change rarely (only when an owner adds/renames/deletes
 * via Phase 66's settings UI), so a 5-minute staleTime is plenty.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import { documentCategorySlugSchema } from '#lib/validation/documents'

const LIST_STALE_TIME_MS = 5 * 60 * 1000 // 5 min — categories change rarely
const LIST_GC_TIME_MS = 30 * 60 * 1000

export interface DocumentCategoryRow {
	id: string
	slug: string
	label: string
	sort_order: number
	is_default: boolean
	owner_user_id: string
	created_at: string | null
	updated_at: string | null
}

/**
 * Maps a PostgREST row into the strictly-typed `DocumentCategoryRow`.
 * Rejects rows whose slug doesn't match the format constraint (a
 * defense against future schema drift; the DB already enforces this
 * at the CHECK constraint level). NOT NULL fields throw if absent.
 */
export function mapDocumentCategoryRow(
	raw: Record<string, unknown>
): DocumentCategoryRow {
	function requireString(field: string): string {
		const value = raw[field]
		if (typeof value !== 'string') {
			throw new Error(
				`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-string from PostgREST response`
			)
		}
		return value
	}
	function requireBool(field: string): boolean {
		const value = raw[field]
		if (typeof value !== 'boolean') {
			throw new Error(
				`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-boolean from PostgREST response`
			)
		}
		return value
	}
	function requireNumber(field: string): number {
		const value = raw[field]
		if (typeof value !== 'number') {
			throw new Error(
				`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-number from PostgREST response`
			)
		}
		return value
	}
	const slug = requireString('slug')
	const slugCheck = documentCategorySlugSchema.safeParse(slug)
	if (!slugCheck.success) {
		throw new Error(
			`mapDocumentCategoryRow: row '${requireString('id')}' has malformed slug '${slug}'`
		)
	}
	return {
		id: requireString('id'),
		slug,
		label: requireString('label'),
		sort_order: requireNumber('sort_order'),
		is_default: requireBool('is_default'),
		owner_user_id: requireString('owner_user_id'),
		created_at: (raw.created_at as string | null) ?? null,
		updated_at: (raw.updated_at as string | null) ?? null
	}
}

export const documentCategoryQueries = {
	all: () =>
		queryOptions({
			queryKey: ['documentCategories'] as const
		}),
	list: () =>
		queryOptions({
			queryKey: ['documentCategories', 'list'] as const,
			queryFn: async (): Promise<DocumentCategoryRow[]> => {
				const supabase = createClient()
				const { data, error } = await supabase
					.from('document_categories')
					.select(
						'id, slug, label, sort_order, is_default, owner_user_id, created_at, updated_at'
					)
					.order('sort_order', { ascending: true })
					.order('label', { ascending: true })
				if (error) handlePostgrestError(error, 'document categories list')
				return ((data ?? []) as Record<string, unknown>[]).map(
					mapDocumentCategoryRow
				)
			},
			staleTime: LIST_STALE_TIME_MS,
			gcTime: LIST_GC_TIME_MS
		})
} as const
