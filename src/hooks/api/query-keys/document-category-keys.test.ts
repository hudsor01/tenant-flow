/**
 * Unit tests for `mapDocumentCategoryRow` — the typed PostgREST→
 * DocumentCategoryRow boundary mapper introduced in v2.6 Phase 65.
 *
 * Mirrors the shape of `document-keys.test.ts`'s `mapDocumentRow`
 * tests so a future column drop / type drift in the
 * `document_categories` SELECT shows up as a loud throw at the
 * mapper boundary rather than as silent string-"undefined" rendering
 * downstream.
 */

import { describe, it, expect } from 'vitest'
import { mapDocumentCategoryRow } from './document-category-keys'

const fullRow = {
	id: '00000000-0000-0000-0000-000000000001',
	slug: 'lease',
	label: 'Lease',
	sort_order: 10,
	is_default: true,
	owner_user_id: '00000000-0000-0000-0000-000000000002',
	created_at: '2026-04-26T00:00:00Z',
	updated_at: '2026-04-26T00:00:00Z'
}

describe('mapDocumentCategoryRow', () => {
	it('passes a fully-populated row through unchanged', () => {
		const mapped = mapDocumentCategoryRow(fullRow)
		expect(mapped).toEqual(fullRow)
	})

	it('passes custom slugs through (Phase 65: any lowercase-snake_case)', () => {
		const mapped = mapDocumentCategoryRow({
			...fullRow,
			slug: 'home_office_2024',
			label: 'Home office 2024',
			is_default: false
		})
		expect(mapped.slug).toBe('home_office_2024')
		expect(mapped.is_default).toBe(false)
	})

	it('throws when a NOT NULL string field is missing', () => {
		for (const field of [
			'id',
			'slug',
			'label',
			'owner_user_id',
			'created_at',
			'updated_at'
		] as const) {
			const broken = { ...fullRow, [field]: undefined }
			expect(
				() => mapDocumentCategoryRow(broken),
				`expected throw when ${field} is missing`
			).toThrowError(new RegExp(`'${field}'`))
		}
	})

	it('throws when sort_order is missing or non-number', () => {
		expect(() =>
			mapDocumentCategoryRow({ ...fullRow, sort_order: undefined })
		).toThrowError(/'sort_order'/)
		expect(() =>
			mapDocumentCategoryRow({ ...fullRow, sort_order: '10' })
		).toThrowError(/'sort_order'/)
	})

	it('throws when is_default is missing or non-boolean', () => {
		expect(() =>
			mapDocumentCategoryRow({ ...fullRow, is_default: undefined })
		).toThrowError(/'is_default'/)
		expect(() =>
			mapDocumentCategoryRow({ ...fullRow, is_default: 'true' })
		).toThrowError(/'is_default'/)
	})

	it('throws when slug fails the format regex (defense-in-depth)', () => {
		// The DB CHECK constraint on document_categories.slug already
		// enforces this, but the mapper re-validates so a future schema
		// drift (CHECK relaxed, regex broadened) doesn't silently pass
		// malformed values through to React keys / URL state.
		for (const slug of [
			'UPPERCASE',
			'has space',
			'has-dash',
			'',
			'a'.repeat(51)
		]) {
			expect(
				() => mapDocumentCategoryRow({ ...fullRow, slug }),
				`expected throw when slug='${slug}'`
			).toThrowError(/malformed slug/)
		}
	})
})
