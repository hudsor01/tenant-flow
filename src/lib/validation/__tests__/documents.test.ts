import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
	DEFAULT_CATEGORY_SLUGS,
	DEFAULT_CATEGORY_LABELS,
	documentCategorySlugSchema,
	makeCategorySchema
} from '../documents'

describe('documentCategorySlugSchema', () => {
	it('accepts every default slug', () => {
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(documentCategorySlugSchema.safeParse(slug).success).toBe(true)
		}
	})

	it('accepts arbitrary lowercase-snake_case slugs (Phase 65: any-slug shape)', () => {
		expect(documentCategorySlugSchema.safeParse('warranty').success).toBe(true)
		expect(documentCategorySlugSchema.safeParse('home_office_2024').success).toBe(true)
	})

	it('rejects malformed slugs', () => {
		expect(documentCategorySlugSchema.safeParse('LEASE').success).toBe(false)
		expect(documentCategorySlugSchema.safeParse('lease 1').success).toBe(false)
		expect(documentCategorySlugSchema.safeParse('lease-1').success).toBe(false)
		expect(documentCategorySlugSchema.safeParse('').success).toBe(false)
		expect(documentCategorySlugSchema.safeParse('a'.repeat(51)).success).toBe(false)
		expect(documentCategorySlugSchema.safeParse(null).success).toBe(false)
		expect(documentCategorySlugSchema.safeParse(undefined).success).toBe(false)
	})

	it('exposes a label for every default slug', () => {
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(DEFAULT_CATEGORY_LABELS[slug]).toBeTruthy()
			expect(typeof DEFAULT_CATEGORY_LABELS[slug]).toBe('string')
		}
	})

	it('default slug list matches the seed function in migration 20260427023101', () => {
		// If you change DEFAULT_CATEGORY_SLUGS, ALSO update the seed function —
		// otherwise new owners get the wrong starter set.
		expect([...DEFAULT_CATEGORY_SLUGS]).toEqual([
			'lease',
			'receipt',
			'tax_return',
			'inspection_report',
			'maintenance_invoice',
			'insurance',
			'other'
		])
	})

	it('migration seed function is in lockstep with DEFAULT_CATEGORY_SLUGS', () => {
		// The seed function in the Phase 65 migration inserts the seven
		// defaults via VALUES tuples. This regex pulls those slug literals
		// and asserts they match DEFAULT_CATEGORY_SLUGS — closes the
		// three-source-of-truth gap (table seed, default labels constant,
		// new-user trigger).
		const migrationSql = readFileSync(
			'supabase/migrations/20260427023101_v26_phase_65_document_categories_table.sql',
			'utf8'
		)
		const seedFn = migrationSql.match(
			/seed_default_document_categories[\s\S]*?on conflict/i
		)?.[0]
		expect(seedFn, 'seed function block not found').toBeDefined()
		const slugSet = new Set(
			Array.from(seedFn!.matchAll(/'([a-z_]+)'/g)).map(m => m[1] as string)
		)
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(slugSet.has(slug), `slug '${slug}' missing from seed function`).toBe(true)
		}
	})
})

describe('makeCategorySchema', () => {
	it('returns a runtime enum gating against the allowed set', () => {
		const schema = makeCategorySchema(['lease', 'insurance'])
		expect(schema.safeParse('lease').success).toBe(true)
		expect(schema.safeParse('insurance').success).toBe(true)
		expect(schema.safeParse('warranty').success).toBe(false)
	})

	it('falls through to the any-slug shape when the allowed list is empty', () => {
		// Loading-state callers shouldn't false-reject every value while
		// the categories query is still in flight.
		const schema = makeCategorySchema([])
		expect(schema.safeParse('lease').success).toBe(true)
		expect(schema.safeParse('warranty').success).toBe(true)
		// But malformed slugs still fail through documentCategorySlugSchema.
		expect(schema.safeParse('LEASE').success).toBe(false)
		expect(schema.safeParse('').success).toBe(false)
	})
})
