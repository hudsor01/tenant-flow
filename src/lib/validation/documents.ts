/**
 * Document Validation Schemas
 *
 * v2.6 Phase 65: replaces the compile-time DOCUMENT_CATEGORIES tuple
 * with a runtime taxonomy lookup. Categories now live in the
 * `document_categories` table (per-owner) and the slug set is loaded
 * via `useDocumentCategories()` rather than imported as a constant.
 *
 * What stays here: the seven default slugs/labels that every owner is
 * seeded with on signup (used as fallback when the categories query
 * hasn't loaded yet, and as the source of truth for the seed function
 * in migration 20260427023101). Migration↔code lockstep is enforced
 * by the integration test in `tests/integration/rls/document-categories.rls.test.ts`.
 *
 * What moves out: the Zod enum is no longer a static `z.enum(tuple)`.
 * Use `makeCategorySchema(allowedSlugs)` when you need runtime
 * validation against a known slug set (e.g. the URL guard reading
 * `?categories=lease,insurance` against the user's own categories).
 */

import { z } from 'zod'

/**
 * Slugs of the seven categories every owner is seeded with on signup.
 * KEEP IN LOCKSTEP with the seed function in
 * `supabase/migrations/20260427023101_v26_phase_65_document_categories_table.sql`.
 * The lockstep test in `tests/integration/rls/document-categories.rls.test.ts`
 * verifies this list matches the seeded rows.
 */
export const DEFAULT_CATEGORY_SLUGS = [
	'lease',
	'receipt',
	'tax_return',
	'inspection_report',
	'maintenance_invoice',
	'insurance',
	'other'
] as const

export type DefaultCategorySlug = (typeof DEFAULT_CATEGORY_SLUGS)[number]

/**
 * Human-readable labels for the seven default slugs. Used as the
 * fallback when a custom slug appears that the user-loaded categories
 * map doesn't know about (e.g. mid-deletion races, optimistic UI).
 */
export const DEFAULT_CATEGORY_LABELS: Record<DefaultCategorySlug, string> = {
	lease: 'Lease',
	receipt: 'Receipt',
	tax_return: 'Tax return',
	inspection_report: 'Inspection report',
	maintenance_invoice: 'Maintenance invoice',
	insurance: 'Insurance',
	other: 'Other'
}

/**
 * Slug shape — any non-empty lowercase-snake_case string up to 50 chars.
 * Mirrors the CHECK constraint on `document_categories.slug`.
 */
export const documentCategorySlugSchema = z
	.string()
	.regex(/^[a-z0-9_]+$/)
	.min(1)
	.max(50)

export type DocumentCategorySlug = z.infer<typeof documentCategorySlugSchema>

/**
 * Document category slugs are now arbitrary strings, validated at
 * runtime against the user's actual category set. Callers that need
 * to gate on the user's allowed set should use `makeCategorySchema`
 * below; callers that just need to pass the slug through (RPC
 * params, mapper boundaries) can use the slug type directly.
 */
export type DocumentCategory = DocumentCategorySlug

/**
 * Build a runtime Zod enum from the user's actual category slug set.
 * Use this where the static `z.enum(tuple)` was used pre-Phase-65 —
 * e.g. URL filter guards that need to scrub unknown slugs.
 *
 * Returns `documentCategorySlugSchema` (any-slug) when the allowed
 * list is empty so loading-state callers don't trip false negatives.
 */
export function makeCategorySchema(
	allowedSlugs: readonly string[]
): z.ZodType<string> {
	if (allowedSlugs.length === 0) return documentCategorySlugSchema
	return z.enum(allowedSlugs as [string, ...string[]])
}
