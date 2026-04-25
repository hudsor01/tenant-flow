/**
 * Document Validation Schemas
 *
 * Categorical taxonomy for public.documents.document_type. Mirrors the
 * CHECK constraint added in migration 20260425172604_v24_phase_61_document_type_taxonomy.
 */

import { z } from 'zod'

// Tuple form for UI iteration (Select options, filter dropdowns).
// Order matches the Select rendering order — most-common categories
// for landlord workflows first, 'other' last as the fallback bucket.
export const DOCUMENT_CATEGORIES = [
	'lease',
	'receipt',
	'tax_return',
	'inspection_report',
	'maintenance_invoice',
	'insurance',
	'other'
] as const

export const documentCategorySchema = z.enum(DOCUMENT_CATEGORIES)

export type DocumentCategory = z.infer<typeof documentCategorySchema>

// Human-readable labels for Select options + filter chips. Keep in
// sync with DOCUMENT_CATEGORIES order so renders are deterministic.
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
	lease: 'Lease',
	receipt: 'Receipt',
	tax_return: 'Tax return',
	inspection_report: 'Inspection report',
	maintenance_invoice: 'Maintenance invoice',
	insurance: 'Insurance',
	other: 'Other'
}
