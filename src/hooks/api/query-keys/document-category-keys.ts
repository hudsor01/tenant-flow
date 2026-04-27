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
	// Both timestamps are NOT NULL (DEFAULT now() + set_updated_at trigger).
	// Typed as string here to surface schema drift if a future migration
	// makes them legitimately nullable.
	created_at: string
	updated_at: string
}

// Module-level helpers — hoisted so they're not recreated per call.
function requireString(
	raw: Record<string, unknown>,
	field: string
): string {
	const value = raw[field]
	if (typeof value !== 'string') {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-string from PostgREST response`
		)
	}
	return value
}
function requireBool(raw: Record<string, unknown>, field: string): boolean {
	const value = raw[field]
	if (typeof value !== 'boolean') {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-boolean from PostgREST response`
		)
	}
	return value
}
function requireNumber(raw: Record<string, unknown>, field: string): number {
	const value = raw[field]
	if (typeof value !== 'number') {
		throw new Error(
			`mapDocumentCategoryRow: NOT NULL field '${field}' missing or non-number from PostgREST response`
		)
	}
	return value
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
	const slug = requireString(raw, 'slug')
	const slugCheck = documentCategorySlugSchema.safeParse(slug)
	if (!slugCheck.success) {
		throw new Error(
			`mapDocumentCategoryRow: row '${requireString(raw, 'id')}' has malformed slug '${slug}'`
		)
	}
	return {
		id: requireString(raw, 'id'),
		slug,
		label: requireString(raw, 'label'),
		sort_order: requireNumber(raw, 'sort_order'),
		is_default: requireBool(raw, 'is_default'),
		owner_user_id: requireString(raw, 'owner_user_id'),
		created_at: requireString(raw, 'created_at'),
		updated_at: requireString(raw, 'updated_at')
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
