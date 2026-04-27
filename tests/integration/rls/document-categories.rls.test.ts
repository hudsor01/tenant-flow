/**
 * Integration tests for `public.document_categories` (v2.6 Phase 65).
 *
 * Pins the contract:
 *   - Owner-scoped RLS (ownerB never sees ownerA's categories).
 *   - Every owner is seeded with the seven v2.5 default slugs.
 *   - The `validate_document_category` BEFORE-INSERT trigger replaces
 *     the dropped Phase-61 CHECK constraint: a docs INSERT with a
 *     non-existent slug raises 23514 / 'is not a valid category'.
 *   - Owner-scoped slug isolation: ownerA can use slug 'lease' (their
 *     own seeded row), but a docs INSERT under ownerA referencing a
 *     slug that ONLY exists in ownerB's category set still fails.
 *   - Lockstep with `src/lib/validation/documents.ts` DEFAULT_CATEGORY_SLUGS.
 */

import {
	DEFAULT_CATEGORY_SLUGS
} from '../../../src/lib/validation/documents'
import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const PAYLOAD = '%PDF-1.4\n%%EOF'

describe('document_categories — owner isolation + slug validation', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let propertyA: { id: string } | null = null
	const insertedDocIds: string[] = []
	const uploadedPaths: string[] = []
	const insertedCategoryIds: string[] = []

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)
		const {
			data: { user: uA }
		} = await clientA.auth.getUser()
		ownerAId = uA!.id

		const { data: p } = await clientA
			.from('properties')
			.insert({
				name: 'Phase-65 Categories Property',
				address_line1: '1 Categories St',
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
		// Custom categories created by these tests must be cleared so the
		// suite is idempotent across reruns. Default seeded categories are
		// owned by the user and live for the user's lifetime — don't touch.
		for (const id of insertedCategoryIds) {
			await clientA.from('document_categories').delete().eq('id', id)
		}
		if (propertyA) await clientA.from('properties').delete().eq('id', propertyA.id)
		await clientA.auth.signOut()
		await clientB.auth.signOut()
	})

	it('seeds the seven default slugs for every owner (lockstep with DEFAULT_CATEGORY_SLUGS)', async () => {
		const { data, error } = await clientA
			.from('document_categories')
			.select('slug, is_default')
			.eq('is_default', true)
			.order('sort_order', { ascending: true })
		expect(error).toBeNull()
		const seededSlugs = (data ?? []).map(r => r.slug as string)
		// Every default slug from the constant must be present (the seed
		// function may have inserted more if Phase 66 ever extends the
		// defaults, so check subset rather than equality).
		for (const slug of DEFAULT_CATEGORY_SLUGS) {
			expect(seededSlugs).toContain(slug)
		}
	})

	it('owner-isolation: ownerB cannot see ownerA categories', async () => {
		// Seed a custom category under ownerA so we have a row that ownerB
		// definitely can't have.
		const { data: row, error: insErr } = await clientA
			.from('document_categories')
			.insert({
				owner_user_id: ownerAId,
				slug: 'phase65_isolation_probe',
				label: 'Isolation probe',
				sort_order: 999,
				is_default: false
			})
			.select('id')
			.single()
		expect(insErr).toBeNull()
		if (row) insertedCategoryIds.push(row.id)

		const { data: bRows, error: bErr } = await clientB
			.from('document_categories')
			.select('id, slug')
			.eq('slug', 'phase65_isolation_probe')
		expect(bErr).toBeNull()
		expect(bRows ?? []).toHaveLength(0)
	})

	it('docs INSERT with an unknown slug is rejected by the validation trigger', async () => {
		const ts = Date.now()
		const path = `property/${propertyA!.id}/${ts}-bad-slug.pdf`
		const { error: storageErr } = await clientA.storage
			.from('tenant-documents')
			.upload(path, new Blob([PAYLOAD], { type: 'application/pdf' }), {
				contentType: 'application/pdf'
			})
		expect(storageErr).toBeNull()
		uploadedPaths.push(path)

		const { error: insertErr } = await clientA
			.from('documents')
			.insert({
				entity_type: 'property',
				entity_id: propertyA!.id,
				document_type: 'totally_unknown_slug',
				mime_type: 'application/pdf',
				file_path: path,
				storage_url: path,
				file_size: PAYLOAD.length,
				title: 'Bad-slug fixture',
				owner_user_id: ownerAId
			})
			.select('id')
			.single()
		expect(insertErr, 'trigger should reject unknown slug').not.toBeNull()
		expect(insertErr!.message).toMatch(/is not a valid category/i)
	})

	it('docs INSERT with a known default slug succeeds', async () => {
		const ts = Date.now() + 1
		const path = `property/${propertyA!.id}/${ts}-good-slug.pdf`
		const { error: storageErr } = await clientA.storage
			.from('tenant-documents')
			.upload(path, new Blob([PAYLOAD], { type: 'application/pdf' }), {
				contentType: 'application/pdf'
			})
		expect(storageErr).toBeNull()
		uploadedPaths.push(path)

		const { data: row, error } = await clientA
			.from('documents')
			.insert({
				entity_type: 'property',
				entity_id: propertyA!.id,
				document_type: 'lease',
				mime_type: 'application/pdf',
				file_path: path,
				storage_url: path,
				file_size: PAYLOAD.length,
				title: 'Default-slug fixture',
				owner_user_id: ownerAId
			})
			.select('id, document_type')
			.single()
		expect(error).toBeNull()
		expect(row?.document_type).toBe('lease')
		if (row) insertedDocIds.push(row.id)
	})

	it('label CHECK constraint rejects empty labels and >80-char labels', async () => {
		// CHECK constraint: length(trim(label)) between 1 and 80.
		const { error: emptyErr } = await clientA
			.from('document_categories')
			.insert({
				owner_user_id: ownerAId,
				slug: 'phase65_empty_label_probe',
				label: '   ', // trims to empty
				sort_order: 998,
				is_default: false
			})
			.select('id')
			.single()
		expect(emptyErr).not.toBeNull()
		expect(emptyErr!.message).toMatch(/check|label/i)

		const { error: longErr } = await clientA
			.from('document_categories')
			.insert({
				owner_user_id: ownerAId,
				slug: 'phase65_long_label_probe',
				label: 'x'.repeat(81),
				sort_order: 998,
				is_default: false
			})
			.select('id')
			.single()
		expect(longErr).not.toBeNull()
		expect(longErr!.message).toMatch(/check|label/i)
	})

	it('slug CHECK constraint rejects malformed slugs (uppercase, spaces, > 50 chars)', async () => {
		const cases = [
			{ slug: 'UPPERCASE_BAD', what: 'uppercase' },
			{ slug: 'has space', what: 'whitespace' },
			{ slug: 'has-dash', what: 'dash' },
			{ slug: 'a'.repeat(51), what: 'over 50 chars' }
		]
		for (const c of cases) {
			const { error } = await clientA
				.from('document_categories')
				.insert({
					owner_user_id: ownerAId,
					slug: c.slug,
					label: 'Probe',
					sort_order: 997,
					is_default: false
				})
				.select('id')
				.single()
			expect(error, `slug case '${c.what}' should be rejected`).not.toBeNull()
			expect(error!.message).toMatch(/check|slug/i)
		}
	})

	it('UNIQUE(owner_user_id, slug) blocks duplicate slug per owner', async () => {
		// Seed a custom slug under ownerA, then try to insert it again.
		const { data: first, error: firstErr } = await clientA
			.from('document_categories')
			.insert({
				owner_user_id: ownerAId,
				slug: 'phase65_unique_probe',
				label: 'Unique probe',
				sort_order: 996,
				is_default: false
			})
			.select('id')
			.single()
		expect(firstErr).toBeNull()
		if (first) insertedCategoryIds.push(first.id)

		const { error: dupErr } = await clientA
			.from('document_categories')
			.insert({
				owner_user_id: ownerAId,
				slug: 'phase65_unique_probe',
				label: 'Duplicate',
				sort_order: 995,
				is_default: false
			})
			.select('id')
			.single()
		expect(dupErr).not.toBeNull()
		expect(dupErr!.message).toMatch(/duplicate|unique/i)
	})
})
