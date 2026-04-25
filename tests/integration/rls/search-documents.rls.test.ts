/**
 * Integration tests for the `search_documents` RPC (v2.4 Phase 60).
 *
 * Pins the contract:
 *   - Caller-isolation via auth.uid() — ownerB never sees ownerA's docs.
 *   - p_query null/empty returns the full owner-scoped set.
 *   - p_query free-text matches title / description / tags.
 *   - p_entity_type filter restricts to one of the four branches.
 *   - p_category filter restricts on `document_type`.
 *   - LIMIT/OFFSET pagination + total_count surfaced for the UI banner.
 *
 * Mirrors `documents-cross-entity.rls.test.ts` fixture pattern: dual
 * client, owner-A creates a property + four document rows with distinct
 * search shapes, asserts each filter independently. Cleanup removes
 * inserted rows in afterAll.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const PAYLOAD = '%PDF-1.4\n%%EOF'

interface SearchDocumentRow {
	id: string
	entity_type: string
	entity_id: string
	document_type: string | null
	mime_type: string | null
	file_path: string
	storage_url: string
	file_size: number | null
	title: string | null
	tags: string[] | null
	description: string | null
	owner_user_id: string | null
	created_at: string
	total_count: number
}

describe('search_documents RPC', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let propertyA: { id: string } | null = null
	const insertedDocIds: string[] = []
	const uploadedPaths: string[] = []

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)
		const {
			data: { user: uA }
		} = await clientA.auth.getUser()
		ownerAId = uA!.id

		// One property + four distinctly-shaped documents under ownerA.
		const { data: p } = await clientA
			.from('properties')
			.insert({
				name: 'Phase-60 Search Property',
				address_line1: '1 Search St',
				city: 'Testville',
				state: 'CA',
				postal_code: '94105',
				country: 'US',
				property_type: 'APARTMENT',
				owner_user_id: ownerAId
			})
			.select('id')
			.single()
		propertyA = p ? { id: p.id } : null
		expect(propertyA, 'property fixture failed').not.toBeNull()

		// Insert documents matching distinct search dimensions:
		//   1. title contains 'taxreturn2025' + tag 'tax' + document_type 'receipt'
		//   2. description contains 'plumbing' + entity_type 'property'
		//   3. tag 'inspection' + document_type 'other'
		//   4. all-blank metadata (only file_path) — should match empty-query only
		const fixtures: Array<{
			title: string | null
			description: string | null
			tags: string[] | null
			document_type: string
			mime_type: string
		}> = [
			{
				title: 'Quarterly taxreturn2025 W2',
				description: 'Year-end statement',
				tags: ['tax', 'irs'],
				document_type: 'receipt',
				mime_type: 'application/pdf'
			},
			{
				title: 'Lease addendum',
				description: 'Plumbing repair clause attached',
				tags: ['legal'],
				document_type: 'other',
				mime_type: 'application/pdf'
			},
			{
				title: 'Move-in walkthrough',
				description: 'Photos and notes',
				tags: ['inspection', 'walkthrough'],
				document_type: 'other',
				// Image fixture (L4): the vault renders <img> for image MIMEs
				// and <iframe> for everything else; covering both branches
				// pins the resolveMime + isImage logic in DocumentRow.
				mime_type: 'image/jpeg'
			},
			{
				title: null,
				description: null,
				tags: null,
				document_type: 'other',
				mime_type: 'application/pdf'
			}
		]

		for (const [idx, fx] of fixtures.entries()) {
			const ts = Date.now() + idx
			const ext = fx.mime_type === 'image/jpeg' ? 'jpg' : 'pdf'
			const path = `property/${propertyA!.id}/${ts}-search-test.${ext}`
			// Bucket allowlist accepts both PDF and image/jpeg; payload
			// content doesn't have to be a real image — the bucket doesn't
			// magic-byte-sniff, only checks the declared contentType.
			const { error: upErr } = await clientA.storage
				.from('tenant-documents')
				.upload(path, new Blob([PAYLOAD], { type: fx.mime_type }), {
					contentType: fx.mime_type
				})
			expect(upErr, `storage upload failed for fixture ${idx}`).toBeNull()
			uploadedPaths.push(path)

			const { data: row, error } = await clientA
				.from('documents')
				.insert({
					entity_type: 'property',
					entity_id: propertyA!.id,
					document_type: fx.document_type,
					mime_type: fx.mime_type,
					file_path: path,
					storage_url: path,
					file_size: PAYLOAD.length,
					title: fx.title,
					description: fx.description,
					tags: fx.tags,
					owner_user_id: ownerAId
				})
				.select('id')
				.single()
			expect(error, `document insert failed for fixture ${idx}`).toBeNull()
			if (row) insertedDocIds.push(row.id)
		}
	})

	afterAll(async () => {
		if (uploadedPaths.length > 0) {
			await clientA.storage
				.from('tenant-documents')
				.remove(uploadedPaths)
				.catch(() => {})
		}
		for (const id of insertedDocIds) {
			await clientA.from('documents').delete().eq('id', id)
		}
		if (propertyA) await clientA.from('properties').delete().eq('id', propertyA.id)
		await clientA.auth.signOut()
		await clientB.auth.signOut()
	})

	// `search_documents` filters by auth.uid() server-side, so any row
	// returned to clientA is owned by ownerA. We could drop the helper
	// entirely, but keeping it documents intent and makes a regression
	// where the RPC drops its WHERE clause fail loudly instead of subtly.
	function ownedRows(rows: SearchDocumentRow[]) {
		return rows.filter(r => r.owner_user_id === ownerAId)
	}

	it('owner-isolation: ownerB cannot see any of ownerA documents', async () => {
		const { data, error } = await clientB.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: 200,
			p_offset: 0
		})
		expect(error).toBeNull()
		const rows = (data ?? []) as SearchDocumentRow[]
		// ownerB's portfolio may contain its own documents from other
		// tests, but NONE of them should be ownerA's inserts.
		for (const id of insertedDocIds) {
			expect(rows.find(r => r.id === id)).toBeUndefined()
		}
	})

	it('empty query returns the full owner-scoped set including all 4 fixtures', async () => {
		const { data, error } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: 200,
			p_offset: 0
		})
		expect(error).toBeNull()
		const rows = ownedRows((data ?? []) as SearchDocumentRow[])
		const ids = new Set(rows.map(r => r.id))
		for (const id of insertedDocIds) {
			expect(ids.has(id)).toBe(true)
		}
		// total_count must equal the number of owner-scoped rows in the
		// unfiltered query.
		expect(rows[0]?.total_count).toBeGreaterThanOrEqual(insertedDocIds.length)
	})

	it('text search matches title / description / tags', async () => {
		// 'taxreturn2025' is unique to fixture 1 (in the title). plainto_tsquery
		// stems but a 13-char token won't match anything else.
		const { data: q1 } = await clientA.rpc('search_documents', {
			p_query: 'taxreturn2025',
			p_entity_type: null,
			p_category: null,
			p_limit: 50,
			p_offset: 0
		})
		const r1 = ownedRows((q1 ?? []) as SearchDocumentRow[])
		expect(r1.find(r => r.title?.includes('taxreturn2025'))).toBeDefined()

		// 'plumbing' is in fixture 2's description.
		const { data: q2 } = await clientA.rpc('search_documents', {
			p_query: 'plumbing',
			p_entity_type: null,
			p_category: null,
			p_limit: 50,
			p_offset: 0
		})
		const r2 = ownedRows((q2 ?? []) as SearchDocumentRow[])
		expect(r2.find(r => r.description?.includes('Plumbing'))).toBeDefined()

		// 'inspection' is in fixture 3's tags.
		const { data: q3 } = await clientA.rpc('search_documents', {
			p_query: 'inspection',
			p_entity_type: null,
			p_category: null,
			p_limit: 50,
			p_offset: 0
		})
		const r3 = ownedRows((q3 ?? []) as SearchDocumentRow[])
		expect(r3.find(r => r.tags?.includes('inspection'))).toBeDefined()
	})

	it('p_entity_type filter excludes other branches', async () => {
		// All 4 fixtures are entity_type='property'. Filtering to 'lease'
		// should return zero of our fixtures.
		const { data } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: 'lease',
			p_category: null,
			p_limit: 50,
			p_offset: 0
		})
		const rows = (data ?? []) as SearchDocumentRow[]
		for (const id of insertedDocIds) {
			expect(rows.find(r => r.id === id)).toBeUndefined()
		}
	})

	it('p_category filter restricts on document_type', async () => {
		// Only fixture 1 has document_type='receipt'.
		const { data } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: 'receipt',
			p_limit: 50,
			p_offset: 0
		})
		const rows = ownedRows((data ?? []) as SearchDocumentRow[])
		const matching = rows.filter(r => insertedDocIds.includes(r.id))
		expect(matching).toHaveLength(1)
		expect(matching[0]!.document_type).toBe('receipt')
	})

	it('LIMIT and OFFSET paginate; total_count surfaces full size', async () => {
		const { data: page1 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: 'property',
			p_category: null,
			p_limit: 2,
			p_offset: 0
		})
		const r1 = (page1 ?? []) as SearchDocumentRow[]
		expect(r1.length).toBeLessThanOrEqual(2)
		const total = r1[0]?.total_count
		expect(total).toBeGreaterThanOrEqual(insertedDocIds.length)

		// Page 2 with the same filter; must not repeat rows from page 1.
		const { data: page2 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: 'property',
			p_category: null,
			p_limit: 2,
			p_offset: 2
		})
		const r2 = (page2 ?? []) as SearchDocumentRow[]
		const overlap = r2.filter(b => r1.find(a => a.id === b.id))
		expect(overlap).toHaveLength(0)
	})

	it('search_vector is populated for every fixture (regression for cycle-1 P0 backfill)', async () => {
		// Cycle-1 audit: the broken backfill left existing rows with
		// search_vector = NULL. The fix populates inline. This test
		// asserts the trigger correctly fills search_vector on INSERT
		// (not just on title/description/tags UPDATE) for every fixture.
		const { data } = await clientA
			.from('documents')
			.select('id, search_vector')
			.in('id', insertedDocIds)
		const rows = (data ?? []) as Array<{
			id: string
			search_vector: string | null
		}>
		expect(rows).toHaveLength(insertedDocIds.length)
		for (const r of rows) {
			expect(
				r.search_vector,
				`row ${r.id} has NULL search_vector — trigger or backfill regressed`
			).not.toBeNull()
		}
	})

	it('rejects invalid limit / offset / null limit / over-200 limit', async () => {
		const { error: e1 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: 0,
			p_offset: 0
		})
		expect(e1).not.toBeNull()
		expect(e1!.message).toMatch(/limit/i)

		const { error: e2 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: 50,
			p_offset: -1
		})
		expect(e2).not.toBeNull()
		expect(e2!.message).toMatch(/offset/i)

		// Cycle-1 M5: also pin the upper bound + null-limit branches so a
		// future migration that drops a guard fails CI.
		const { error: e3 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: 201,
			p_offset: 0
		})
		expect(e3).not.toBeNull()
		expect(e3!.message).toMatch(/limit/i)

		const { error: e4 } = await clientA.rpc('search_documents', {
			p_query: null,
			p_entity_type: null,
			p_category: null,
			p_limit: null as unknown as number,
			p_offset: 0
		})
		expect(e4).not.toBeNull()
		expect(e4!.message).toMatch(/limit/i)
	})
})
