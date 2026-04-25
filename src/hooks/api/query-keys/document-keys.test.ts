/**
 * Unit tests for `mapDocumentRow` — the typed PostgREST→DocumentRow
 * boundary mapper introduced in PR #636 cycle-2 (P2-1).
 *
 * Pins three behaviours the cycle-3 audit raised:
 *   (a) Valid taxonomy values pass through unchanged.
 *   (b) Out-of-band `document_type` degrades to `'other'` rather than
 *       poisoning downstream Record<DocumentCategory, ...> lookups.
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

	it('degrades an out-of-band document_type to "other" (cycle-3 boundary defense)', () => {
		const mapped = mapDocumentRow({ ...fullRow, document_type: 'warranty' })
		expect(mapped.document_type).toBe('other')
	})

	it('degrades a null document_type to "other"', () => {
		const mapped = mapDocumentRow({ ...fullRow, document_type: null })
		expect(mapped.document_type).toBe('other')
	})

	it('throws when a NOT NULL field is missing from the PostgREST response (cycle-3 NIT-1)', () => {
		// Drop `id` — a future hand-edited `.select(...)` typo is the
		// realistic regression scenario this guards against.
		const { id: _id, ...withoutId } = fullRow
		void _id
		expect(() => mapDocumentRow(withoutId)).toThrowError(/'id'/)
	})

	it('throws on each NOT NULL field independently', () => {
		for (const field of [
			'entity_type',
			'entity_id',
			'file_path',
			'storage_url',
			'created_at'
		] as const) {
			const broken = { ...fullRow, [field]: undefined }
			expect(
				() => mapDocumentRow(broken),
				`expected throw when ${field} is missing`
			).toThrowError(new RegExp(`'${field}'`))
		}
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
