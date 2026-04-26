/**
 * Edge-Function-level integration test for `download-documents-zip`
 * (v2.6 Phase 64). Proves the auth boundary holds end-to-end:
 *
 *   - ownerA inserts a document with a unique title sentinel
 *   - ownerB POSTs to the function URL with their own JWT and a filter
 *     that would match ownerA's sentinel
 *   - The function MUST NOT return 200 with ownerA's bytes; it must
 *     return 404 ("No documents match") because the inner
 *     search_documents RPC re-derives auth.uid() from ownerB's JWT
 *     under their RLS scope
 *
 * Companion to `search_documents.rls.test.ts:183` (RPC-level isolation).
 * The added value here is proving the function-level
 *   - apikey/JWT pairing isn't silently elevating to service-role
 *   - the user-scoped client wiring stays defensive against future
 *     refactors that strip the Authorization header
 *
 * Cycle-1 of PR #643 caught the original implementation pairing
 * SUPABASE_SERVICE_ROLE_KEY with a user JWT; this test exists to fail
 * loudly if any future refactor reintroduces that ambiguity.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const PAYLOAD = '%PDF-1.4\n%%EOF'
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']

describe('download-documents-zip Edge Function — owner isolation', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerATokens: { access_token: string }
	let ownerBTokens: { access_token: string }
	let ownerAId: string
	let propertyA: { id: string } | null = null
	const insertedDocIds: string[] = []
	const uploadedPaths: string[] = []
	const sentinel = `phase64-isolation-${Date.now()}`

	beforeAll(async () => {
		if (!SUPABASE_URL) {
			throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set')
		}
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)

		const sessionA = await clientA.auth.getSession()
		const sessionB = await clientB.auth.getSession()
		const tokenA = sessionA.data.session?.access_token
		const tokenB = sessionB.data.session?.access_token
		if (!tokenA || !tokenB) {
			throw new Error('Both owners must have a session JWT')
		}
		ownerATokens = { access_token: tokenA }
		ownerBTokens = { access_token: tokenB }

		const {
			data: { user: uA }
		} = await clientA.auth.getUser()
		ownerAId = uA!.id

		const { data: p } = await clientA
			.from('properties')
			.insert({
				name: 'Phase-64 Isolation Property',
				address_line1: '1 Isolation St',
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

		const ts = Date.now()
		const path = `property/${propertyA!.id}/${ts}-${sentinel}.pdf`
		const { error: upErr } = await clientA.storage
			.from('tenant-documents')
			.upload(path, new Blob([PAYLOAD], { type: 'application/pdf' }), {
				contentType: 'application/pdf'
			})
		expect(upErr).toBeNull()
		uploadedPaths.push(path)

		const { data: row, error } = await clientA
			.from('documents')
			.insert({
				entity_type: 'property',
				entity_id: propertyA!.id,
				document_type: 'other',
				mime_type: 'application/pdf',
				file_path: path,
				storage_url: path,
				file_size: PAYLOAD.length,
				title: sentinel,
				owner_user_id: ownerAId
			})
			.select('id')
			.single()
		expect(error).toBeNull()
		if (row) insertedDocIds.push(row.id)
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

	it('ownerA can download a zip containing the sentinel doc', async () => {
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${ownerATokens.access_token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query: sentinel })
			}
		)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('application/zip')
		// Empty-body regression guard: a 200 + zip content-type with zero
		// bytes would still pass the contract test above. Assert the
		// response carries a non-trivial payload that begins with the
		// zip magic bytes (`PK\x03\x04` = 0x50 0x4B 0x03 0x04).
		const buf = await res.arrayBuffer()
		expect(buf.byteLength).toBeGreaterThan(0)
		const magic = new Uint8Array(buf.slice(0, 2))
		expect(magic[0]).toBe(0x50)
		expect(magic[1]).toBe(0x4b)
	})

	it('ownerB filtering by ownerA sentinel receives 404, never 200', async () => {
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${ownerBTokens.access_token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query: sentinel })
			}
		)
		// Critical: a 200 here would mean ownerB downloaded ownerA's
		// document — that's the privilege-escalation regression we exist
		// to catch. The function must return 404 because the inner RPC
		// runs under ownerB's JWT and finds no matching documents.
		expect(res.status).toBe(404)
		expect(res.headers.get('content-type')).toContain('application/json')
		const body = (await res.json()) as { error?: string }
		expect(body.error).toMatch(/no documents match/i)
	})

	it('ownerB without a Bearer token receives 401', async () => {
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: sentinel })
			}
		)
		expect([401, 403]).toContain(res.status)
		await res.arrayBuffer()
	})
})
