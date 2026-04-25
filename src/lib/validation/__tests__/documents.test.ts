import { describe, it, expect } from 'vitest'
import {
	DOCUMENT_CATEGORIES,
	DOCUMENT_CATEGORY_LABELS,
	documentCategorySchema
} from '../documents'

describe('documentCategorySchema', () => {
	it('accepts every category in DOCUMENT_CATEGORIES', () => {
		for (const category of DOCUMENT_CATEGORIES) {
			expect(documentCategorySchema.safeParse(category).success).toBe(true)
		}
	})

	it('rejects values outside the enum', () => {
		expect(documentCategorySchema.safeParse('warranty').success).toBe(false)
		expect(documentCategorySchema.safeParse('LEASE').success).toBe(false)
		expect(documentCategorySchema.safeParse('').success).toBe(false)
		expect(documentCategorySchema.safeParse(null).success).toBe(false)
		expect(documentCategorySchema.safeParse(undefined).success).toBe(false)
	})

	it('exposes a label for every category — keeps Select renders deterministic', () => {
		for (const category of DOCUMENT_CATEGORIES) {
			expect(DOCUMENT_CATEGORY_LABELS[category]).toBeTruthy()
			expect(typeof DOCUMENT_CATEGORY_LABELS[category]).toBe('string')
		}
	})

	it('matches the CHECK constraint in migration 20260425172604 exactly', () => {
		// If you change DOCUMENT_CATEGORIES, ALSO update the migration —
		// otherwise PostgREST inserts will throw 23514 check_violation.
		expect([...DOCUMENT_CATEGORIES]).toEqual([
			'lease',
			'receipt',
			'tax_return',
			'inspection_report',
			'maintenance_invoice',
			'insurance',
			'other'
		])
	})
})
