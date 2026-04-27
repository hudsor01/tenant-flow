/**
 * Unit tests for `mapDocumentRow` — the typed PostgREST→DocumentRow
 * boundary mapper.
 *
 * v2.6 Phase 65 changed `document_type` from a CHECK-enum column to a
 * soft FK against `document_categories.slug`. The mapper no longer
 * clamps to a closed enum — it trusts whatever slug the DB returns
 * (the BEFORE-INSERT trigger already validated it at write time).
 *
 * Pins:
 *   (a) Valid slugs pass through unchanged.
 *   (b) Custom slugs (Phase 65: arbitrary lowercase-snake_case) pass through.
 *   (c) Missing NOT NULL fields throw with a descriptive message
 *       rather than silently producing the literal string "undefined".
 */

import { describe, it, expect } from 'vitest'
import { mapDocumentRow } from './document-keys'

const fullRow = {
	id: '00000000-0000-0000-0000-000000000001',
	entity_type: 'property',
	entity_id: '00000000-0000-0000-0000-000000000002',
	document_type: 'lease',
	mime_type: 'application/pdf',
	file_path: 'property/p/1.pdf',
	storage_url: 'property/p/1.pdf',
	file_size: 1024,
	title: 'Lease addendum',
	tags: ['legal'] as string[],
	description: null,
	owner_user_id: '00000000-0000-0000-0000-000000000003',
	created_at: '2026-04-25T00:00:00Z'
}

describe('mapDocumentRow', () => {
	it('passes through a row whose document_type is in the taxonomy', () => {
		const mapped = mapDocumentRow(fullRow)
		expect(mapped.document_type).toBe('lease')
		expect(mapped.id).toBe(fullRow.id)
		expect(mapped.entity_type).toBe('property')
		expect(mapped.tags).toEqual(['legal'])
		expect(mapped.description).toBeNull()
	})

	it('passes through custom slugs (Phase 65: any lowercase-snake_case)', () => {
		// Pre-Phase-65 this would have degraded to 'other'. Now slugs are
		// per-owner via the document_categories table; the trigger gates
		// at write time, so any slug coming OUT of PostgREST is by
		// definition one the owner has in their taxonomy.
		const mapped = mapDocumentRow({ ...fullRow, document_type: 'warranty' })
		expect(mapped.document_type).toBe('warranty')
	})

	it('throws when document_type is null (column is NOT NULL since Phase 61)', () => {
		expect(() => mapDocumentRow({ ...fullRow, document_type: null })).toThrowError(
			/'document_type'/
		)
	})

	it('throws when a NOT NULL field is missing from the PostgREST response', () => {
		// Drop `id` — a future hand-edited `.select(...)` typo is the
		// realistic regression scenario this guards against.
		const { id: _id, ...withoutId } = fullRow
		expect(() => mapDocumentRow(withoutId)).toThrowError(/'id'/)
	})

	it('throws on each NOT NULL field independently', () => {
		// created_at is intentionally NOT in this list — the DB column is
		// nullable (DEFAULT now() but no NOT NULL) so the mapper accepts
		// null and lets downstream consumers handle it.
		for (const field of [
			'entity_type',
			'entity_id',
			'document_type',
			'file_path',
			'storage_url'
		] as const) {
			const broken = { ...fullRow, [field]: undefined }
			expect(
				() => mapDocumentRow(broken),
				`expected throw when ${field} is missing`
			).toThrowError(new RegExp(`'${field}'`))
		}
	})

	it('treats null created_at as null (DB column is nullable, cycle-4 P3)', () => {
		const mapped = mapDocumentRow({ ...fullRow, created_at: null })
		expect(mapped.created_at).toBeNull()
	})

	it('treats a null mime_type / tags / description / owner_user_id as null', () => {
		const mapped = mapDocumentRow({
			...fullRow,
			mime_type: null,
			tags: null,
			description: null,
			owner_user_id: null
		})
		expect(mapped.mime_type).toBeNull()
		expect(mapped.tags).toBeNull()
		expect(mapped.description).toBeNull()
		expect(mapped.owner_user_id).toBeNull()
	})
})
