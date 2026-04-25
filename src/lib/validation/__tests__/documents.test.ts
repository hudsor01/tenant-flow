import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
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

	it('migration source is in lockstep with DOCUMENT_CATEGORIES (NIT cross-check)', () => {
		// Reads the migration file at runtime and parses the literal CHECK
		// list. Catches the three-source-of-truth drift: if someone edits
		// the tuple WITHOUT updating the migration (or vice versa), the
		// hard-coded array literal above would still match the tuple but
		// this test fails. The migration is the database's source of
		// truth; this guard makes the repo's source of truth match it.
		const migrationSql = readFileSync(
			'supabase/migrations/20260425172604_v24_phase_61_document_type_taxonomy.sql',
			'utf8'
		)
		const checkBlock = migrationSql.match(
			/check \(document_type in \(([\s\S]*?)\)\)/
		)?.[1]
		expect(checkBlock, 'CHECK block not found in migration').toBeDefined()
		const quoted = (checkBlock!.match(/'([^']+)'/g) ?? []).map(m =>
			m.replace(/^'|'$/g, '')
		)
		expect(quoted.sort()).toEqual([...DOCUMENT_CATEGORIES].sort())
	})
})
