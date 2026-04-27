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
// `tests/integration/setup/supabase-client.ts` already throws at
// import-time when these env vars are missing, so the `!` here is
// safe by transitive guarantee. Rebinding to a narrowed `string`
// eliminates `!` at every usage site (cycle-7 M-3).
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']!
const SUPABASE_PUBLISHABLE_KEY =
	process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']!

// Probe whether the Edge Function is deployed. Edge Functions have no
// automatic CI deploy step (they ship via `supabase functions deploy`
// or MCP, out-of-band from this repo's PR pipeline), so a brand-new
// function can land in this branch before the prod deployment exists.
// When the function isn't deployed the Supabase gateway returns a
// 404 with body `{code: 'NOT_FOUND', ...}`; the function's own 404
// uses `{error: 'No documents match...'}`.
//
// Fail-OPEN policy: ONLY a gateway 404 + `{code: 'NOT_FOUND'}` is treated
// as "not deployed". Every other outcome (5xx, 429, network error, DNS
// failure) returns true, so the security-isolation tests run and fail
// LOUDLY rather than silently skipping behind a transient blip.
async function isFunctionDeployed(): Promise<boolean> {
	if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false
	try {
		const probe = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					apikey: SUPABASE_PUBLISHABLE_KEY
				},
				body: '{}'
			}
		)
		if (probe.status === 404) {
			const body = (await probe.json().catch(() => ({}))) as {
				code?: string
			}
			return body.code !== 'NOT_FOUND'
		}
		return true
	} catch {
		// Network unreachable is also treated as fail-open per the policy
		// above — let the actual test fail with the real error rather
		// than masking it as a deployment skip.
		return true
	}
}

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

	let suiteDeployed = false

	beforeAll(async () => {
		suiteDeployed = await isFunctionDeployed()
		if (!suiteDeployed) {
			console.warn(
				'[download-documents-zip] Edge Function not deployed; skipping suite. ' +
					'Run `supabase functions deploy download-documents-zip` before merging.'
			)
			return
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
		if (!suiteDeployed) return
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

	it('ownerA can download a zip containing the sentinel doc', async ctx => {
		if (!suiteDeployed) ctx.skip()
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${ownerATokens.access_token}`,
					apikey: SUPABASE_PUBLISHABLE_KEY,
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

	it('ownerB filtering by ownerA sentinel receives 404, never 200', async ctx => {
		if (!suiteDeployed) ctx.skip()
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${ownerBTokens.access_token}`,
					apikey: SUPABASE_PUBLISHABLE_KEY,
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

	it('a request without a Bearer token receives 401', async ctx => {
		if (!suiteDeployed) ctx.skip()
		const res = await fetch(
			`${SUPABASE_URL}/functions/v1/download-documents-zip`,
			{
				method: 'POST',
				headers: {
					apikey: SUPABASE_PUBLISHABLE_KEY,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query: sentinel })
			}
		)
		// Pinned to 401 — validateBearerAuth returns 401 with "Missing
		// authorization header" before any function logic runs. Loose
		// assertions like `[401, 403]` would mask a regression where the
		// Supabase gateway started rejecting at a different layer.
		expect(res.status).toBe(401)
		await res.arrayBuffer()
	})
})
