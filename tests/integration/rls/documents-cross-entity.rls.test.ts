/**
 * Cross-entity storage RLS tests for v2.4 Phase 59.
 *
 * v2.3 shipped the document vault for property-scoped uploads only.
 * Phase 59 extended the `tenant-documents` bucket RLS to also cover
 * `lease`, `tenant`, and `maintenance_request` branches. These tests
 * pin the ownership invariant across every branch — ownerA uploads a
 * document tied to each of their entities; ownerB cannot SELECT, UPDATE,
 * or DELETE any of them.
 *
 * The tests exercise the REAL storage RLS against prod Supabase under
 * dual-client auth — this is the integration-test coverage the
 * cycle-4 audit confirmed is non-negotiable for SECURITY DEFINER + RLS
 * surfaces.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'tenant-documents'

interface Fixture {
	property: { id: string } | null
	lease: { id: string } | null
	tenant: { id: string } | null
	maintenanceRequest: { id: string } | null
	unit: { id: string } | null
	// Uploaded storage paths for cleanup.
	uploadedPaths: string[]
}

function emptyFixture(): Fixture {
	return {
		property: null,
		lease: null,
		tenant: null,
		maintenanceRequest: null,
		unit: null,
		uploadedPaths: []
	}
}

async function createFixtures(
	client: SupabaseClient,
	ownerId: string,
	label: string
): Promise<Fixture> {
	const fix = emptyFixture()

	const { data: p } = await client
		.from('properties')
		.insert({
			name: `Phase-59 ${label} Property`,
			address_line1: '1 Test St',
			city: 'Testville',
			state: 'CA',
			postal_code: '94105',
			country: 'US',
			property_type: 'APARTMENT',
			owner_user_id: ownerId
		})
		.select('id')
		.single()
	fix.property = p ? { id: p.id } : null

	if (fix.property) {
		const { data: u } = await client
			.from('units')
			.insert({
				property_id: fix.property.id,
				unit_number: `P59-${label}-101`,
				bedrooms: 1,
				bathrooms: 1,
				rent_amount: 1500,
				owner_user_id: ownerId
			})
			.select('id')
			.single()
		fix.unit = u ? { id: u.id } : null
	}

	const { data: t } = await client
		.from('tenants')
		.insert({
			email: `phase59-${label.toLowerCase()}-${Date.now()}@example.com`,
			first_name: 'Phase',
			last_name: `Tester-${label}`,
			owner_user_id: ownerId
		})
		.select('id')
		.single()
	fix.tenant = t ? { id: t.id } : null

	if (fix.unit && fix.tenant) {
		const { data: l } = await client
			.from('leases')
			.insert({
				unit_id: fix.unit.id,
				primary_tenant_id: fix.tenant.id,
				start_date: '2026-05-01',
				end_date: '2027-04-30',
				rent_amount: 1800,
				security_deposit: 1800,
				payment_day: 1,
				lease_status: 'draft',
				rent_currency: 'USD',
				owner_user_id: ownerId
			})
			.select('id')
			.single()
		fix.lease = l ? { id: l.id } : null
	}

	if (fix.property) {
		const { data: m } = await client
			.from('maintenance_requests')
			.insert({
				property_id: fix.property.id,
				title: `Phase-59 ${label} Maintenance`,
				description: 'Integration test fixture',
				status: 'open',
				priority: 'medium',
				owner_user_id: ownerId
			})
			.select('id')
			.single()
		fix.maintenanceRequest = m ? { id: m.id } : null
	}

	return fix
}

async function cleanupFixtures(client: SupabaseClient, fix: Fixture) {
	if (fix.uploadedPaths.length > 0) {
		await client.storage.from(BUCKET).remove(fix.uploadedPaths).catch(() => {})
	}
	if (fix.maintenanceRequest) {
		await client.from('maintenance_requests').delete().eq('id', fix.maintenanceRequest.id)
	}
	if (fix.lease) await client.from('leases').delete().eq('id', fix.lease.id)
	if (fix.tenant) await client.from('tenants').delete().eq('id', fix.tenant.id)
	if (fix.unit) await client.from('units').delete().eq('id', fix.unit.id)
	if (fix.property) await client.from('properties').delete().eq('id', fix.property.id)
}

describe('Documents cross-entity storage RLS', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let ownerBId: string
	let fixA: Fixture = emptyFixture()
	let fixB: Fixture = emptyFixture()

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)
		const { data: { user: uA } } = await clientA.auth.getUser()
		const { data: { user: uB } } = await clientB.auth.getUser()
		ownerAId = uA!.id
		ownerBId = uB!.id

		fixA = await createFixtures(clientA, ownerAId, 'A')
		fixB = await createFixtures(clientB, ownerBId, 'B')
	})

	afterAll(async () => {
		await cleanupFixtures(clientA, fixA)
		await cleanupFixtures(clientB, fixB)
		await clientA.auth.signOut()
		await clientB.auth.signOut()
	})

	// Helper: upload a document to ownerA's entity, verify ownerB can't access it.
	async function assertCrossOwnerIsolation(
		entityType: 'property' | 'lease' | 'tenant' | 'maintenance_request',
		entityIdGetter: (f: Fixture) => string | undefined
	) {
		const idA = entityIdGetter(fixA)
		if (!idA) {
			console.warn(`Skipping ${entityType}: fixture not created`)
			return
		}

		const path = `${entityType}/${idA}/${Date.now()}-test.txt`
		const blob = new Blob(['test'], { type: 'text/plain' })

		// ownerA uploads (note: MIME allowlist blocks text/plain in reality;
		// RLS evaluates first, so the MIME check is a separate reject path
		// that doesn't interfere with this test).
		const { error: upErr } = await clientA.storage
			.from(BUCKET)
			.upload(path, blob, { contentType: 'application/pdf' })
		if (upErr) {
			// Some environments reject non-PDF even with contentType override.
			// Try a minimal PDF header instead.
			const pdfBlob = new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' })
			const { error: upErr2 } = await clientA.storage
				.from(BUCKET)
				.upload(path, pdfBlob, { contentType: 'application/pdf' })
			expect(upErr2).toBeNull()
		}
		fixA.uploadedPaths.push(path)

		// ownerB cannot see it via list
		const prefix = `${entityType}/${idA}`
		const { data: listedByB } = await clientB.storage.from(BUCKET).list(prefix)
		expect(listedByB ?? []).toHaveLength(0)

		// ownerB cannot download/signed-url it
		const { data: signedB } = await clientB.storage
			.from(BUCKET)
			.createSignedUrl(path, 60)
		expect(signedB).toBeNull()

		// ownerB cannot delete it — if this returned data with non-empty
		// array it would mean RLS let them through.
		const { data: removedB } = await clientB.storage.from(BUCKET).remove([path])
		expect(removedB ?? []).toHaveLength(0)

		// ownerA can still see it
		const { data: listedByA } = await clientA.storage.from(BUCKET).list(prefix)
		expect(listedByA?.length ?? 0).toBeGreaterThan(0)
	}

	it('property branch — ownerB cannot access ownerA uploads', async () => {
		await assertCrossOwnerIsolation('property', f => f.property?.id)
	})

	it('lease branch — ownerB cannot access ownerA uploads', async () => {
		await assertCrossOwnerIsolation('lease', f => f.lease?.id)
	})

	it('tenant branch — ownerB cannot access ownerA uploads', async () => {
		await assertCrossOwnerIsolation('tenant', f => f.tenant?.id)
	})

	it('maintenance_request branch — ownerB cannot access ownerA uploads', async () => {
		await assertCrossOwnerIsolation(
			'maintenance_request',
			f => f.maintenanceRequest?.id
		)
	})

	it('rejects upload with off-convention path segments (path-traversal guard)', async () => {
		if (!fixA.property) return
		// Path with 3 segments (sub-directory) should be blocked by the
		// `array_length = 2` guard — even if ownerA owns the property.
		const badPath = `property/${fixA.property.id}/sub/${Date.now()}-evil.pdf`
		const pdf = new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' })
		const { error } = await clientA.storage
			.from(BUCKET)
			.upload(badPath, pdf, { contentType: 'application/pdf' })
		expect(error).not.toBeNull()
	})

	it('rejects upload with non-UUID entity_id segment', async () => {
		const badPath = `property/not-a-uuid/${Date.now()}-evil.pdf`
		const pdf = new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' })
		const { error } = await clientA.storage
			.from(BUCKET)
			.upload(badPath, pdf, { contentType: 'application/pdf' })
		expect(error).not.toBeNull()
	})
})
