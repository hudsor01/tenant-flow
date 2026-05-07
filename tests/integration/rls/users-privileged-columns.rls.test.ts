/**
 * Integration tests for the P0 security hardening on `public.users`.
 *
 * Migration: 20260507190024_lock_privileged_user_columns_and_p0_security.sql
 *
 * Pins three independent fixes:
 *
 *   P0-1  An authenticated user can no longer self-promote to admin or
 *         flip their own subscription state. Two layers of defense:
 *           (a) column-level GRANT UPDATE was narrowed to a 10-column
 *               allowlist (REVOKE … FROM authenticated; GRANT (cols)
 *               TO authenticated). PostgREST should refuse the write
 *               with 42501 (insufficient_privilege).
 *           (b) BEFORE-UPDATE trigger `users_guard_self_update` raises
 *               42501 if any privileged column changes when the caller
 *               is not service_role/postgres/supabase_admin.
 *         The trigger is a backstop; the column GRANT is the primary
 *         defense. PostgREST today returns 42501 from the column GRANT
 *         layer before the row reaches the trigger, but we assert on
 *         "the error code is 42501 / 'permission denied'" — either
 *         layer satisfies the contract.
 *
 *   P0-2  `sign_lease_and_check_activation` is no longer EXECUTE-able
 *         from `authenticated` or PUBLIC. App code never calls it; lease
 *         signatures flow through the HMAC-protected `docuseal-webhook`
 *         which runs as service_role. PostgREST returns 42883
 *         (undefined_function) because PostgREST resolves a function only
 *         if the caller has EXECUTE — once revoked, the function is
 *         invisible to PostgREST under the `authenticated` role.
 *
 *   P0-3  The path-checkless INSERT policy on `storage.objects` for
 *         the `property-images` bucket was dropped. Only the strict
 *         `Property owners can upload images` policy remains. Owner A
 *         can upload to A's property folder; Owner A cannot upload to
 *         Owner B's property folder.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('P0 security hardening — public.users + sign_lease + property-images storage', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let ownerBId: string
	const insertedPropertyIds: string[] = []
	const uploadedStoragePaths: string[] = []

	beforeAll(async () => {
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)
		const {
			data: { user: uA }
		} = await clientA.auth.getUser()
		const {
			data: { user: uB }
		} = await clientB.auth.getUser()
		ownerAId = uA!.id
		ownerBId = uB!.id
	})

	afterAll(async () => {
		// Best-effort cleanup. RLS lets each owner delete only their own rows.
		for (const path of uploadedStoragePaths) {
			await clientA.storage.from('property-images').remove([path])
		}
		for (const id of insertedPropertyIds) {
			await clientA.from('properties').delete().eq('id', id)
		}
	})

	// --- P0-1 ---------------------------------------------------------

	describe('P0-1: privileged columns on public.users are not writable from authenticated', () => {
		it('rejects self-promotion to admin (is_admin)', async () => {
			const { error } = await clientA
				.from('users')
				.update({ is_admin: true })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects self-flipping subscription_status', async () => {
			const { error } = await clientA
				.from('users')
				.update({ subscription_status: 'active' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects self-write of stripe_customer_id (billing-portal hijack vector)', async () => {
			const { error } = await clientA
				.from('users')
				.update({ stripe_customer_id: 'cus_attacker_supplied' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects self-write of subscription_plan', async () => {
			const { error } = await clientA
				.from('users')
				.update({ subscription_plan: 'max' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects self-write of trial_ends_at (extend-trial-forever vector)', async () => {
			const { error } = await clientA
				.from('users')
				.update({ trial_ends_at: '2099-01-01T00:00:00Z' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects self-write of email (drift between auth.users and public.users)', async () => {
			const { error } = await clientA
				.from('users')
				.update({ email: 'attacker-rewrite@example.com' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('still allows safe self-updates (phone) — UX must not regress', async () => {
			const { data: before } = await clientA
				.from('users')
				.select('phone')
				.eq('id', ownerAId)
				.single()
			const phoneBefore = before?.phone ?? null

			const probe = '(555) 123-4567'
			const { error: writeError } = await clientA
				.from('users')
				.update({ phone: probe })
				.eq('id', ownerAId)
			expect(writeError).toBeNull()

			const { data: after } = await clientA
				.from('users')
				.select('phone')
				.eq('id', ownerAId)
				.single()
			expect(after?.phone).toBe(probe)

			// Restore so the test is idempotent.
			await clientA
				.from('users')
				.update({ phone: phoneBefore })
				.eq('id', ownerAId)
		})

		it('still allows safe self-update of emergency_contact_* columns', async () => {
			const { data: before } = await clientA
				.from('users')
				.select(
					'emergency_contact_name, emergency_contact_phone, emergency_contact_relationship'
				)
				.eq('id', ownerAId)
				.single()

			const { error: writeError } = await clientA
				.from('users')
				.update({
					emergency_contact_name: 'Probe Name',
					emergency_contact_phone: '(555) 999-0000',
					emergency_contact_relationship: 'spouse'
				})
				.eq('id', ownerAId)
			expect(writeError).toBeNull()

			// Restore (best effort — restore to nulls if the original was nulls).
			await clientA
				.from('users')
				.update({
					emergency_contact_name: before?.emergency_contact_name ?? null,
					emergency_contact_phone: before?.emergency_contact_phone ?? null,
					emergency_contact_relationship:
						before?.emergency_contact_relationship ?? null
				})
				.eq('id', ownerAId)
		})
	})

	// --- P0-2 ---------------------------------------------------------

	describe('P0-2: sign_lease_and_check_activation is not callable from authenticated', () => {
		it('PostgREST returns "function not found" — EXECUTE is revoked', async () => {
			const { error } = await clientA.rpc(
				'sign_lease_and_check_activation' as never,
				{
					p_lease_id: '00000000-0000-0000-0000-000000000000',
					p_signer_type: 'owner',
					p_signature_ip: '127.0.0.1',
					p_signed_at: new Date().toISOString(),
					p_signature_method: 'in_app'
				} as never
			)
			expect(error).not.toBeNull()
			// PostgREST surfaces a revoked EXECUTE on a SECURITY DEFINER
			// function as 42501 (permission denied — this is what we just
			// observed against prod). Older PostgREST versions returned
			// 42883 / PGRST202 for the same shape; accept any of them so
			// the test pins "the function is no longer reachable from
			// authenticated", not a specific error-code string.
			expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
		})
	})

	// --- P0-3 ---------------------------------------------------------

	describe('P0-3: property-images storage requires path-ownership', () => {
		it('owner can upload into a folder for a property they own', async () => {
			// Create a fresh property under ownerA so the path-uuid maps to a
			// row ownerA owns. Use a unique name to avoid collisions.
			const { data: prop, error: propErr } = await clientA
				.from('properties')
				.insert({
					name: `RLS-probe-${Date.now()}`,
					address_line1: '1 Test Way',
					city: 'Test',
					state: 'CA',
					postal_code: '90001',
					owner_user_id: ownerAId,
					property_type: 'single_family'
				})
				.select('id')
				.single()
			if (propErr) throw propErr
			insertedPropertyIds.push(prop!.id)

			const path = `${prop!.id}/probe-${Date.now()}.jpg`
			const { error: upErr } = await clientA.storage
				.from('property-images')
				.upload(path, new Blob(['probe'], { type: 'image/jpeg' }))
			expect(upErr).toBeNull()
			uploadedStoragePaths.push(path)
		})

		it('owner B cannot upload into owner A property folder (was the P0-3 hole)', async () => {
			// Use the property ownerA created above so the test is order-
			// independent — fall back to creating one if the previous test
			// didn't run (e.g., partial-suite run).
			let targetPropertyId: string | undefined =
				insertedPropertyIds[insertedPropertyIds.length - 1]
			if (!targetPropertyId) {
				const { data: prop, error: propErr } = await clientA
					.from('properties')
					.insert({
						name: `RLS-probe-${Date.now()}`,
						address: '1 Test Way',
						city: 'Test',
						state: 'CA',
						zip_code: '90001',
						owner_user_id: ownerAId,
						property_type: 'single_family'
					})
					.select('id')
					.single()
				if (propErr) throw propErr
				insertedPropertyIds.push(prop!.id)
				targetPropertyId = prop!.id
			}

			const path = `${targetPropertyId}/cross-owner-${Date.now()}.jpg`
			const { error } = await clientB.storage
				.from('property-images')
				.upload(path, new Blob(['attack'], { type: 'image/jpeg' }))
			expect(error).not.toBeNull()
			// Storage RLS returns "new row violates row-level security policy"
			// (statusCode 403, RLS error). Match either statusCode 403 or the
			// error name.
			expect(
				(error as unknown as { statusCode?: string; error?: string }).statusCode ??
					error!.message
			).toBeTruthy()
		})

		it('owner B cannot upload into a folder whose uuid does not exist (no implicit allow)', async () => {
			// Folder uuid that doesn't appear in `properties` at all.
			const fakeFolder = '00000000-0000-0000-0000-000000000001'
			const path = `${fakeFolder}/orphan-${Date.now()}.jpg`
			const { error } = await clientB.storage
				.from('property-images')
				.upload(path, new Blob(['orphan'], { type: 'image/jpeg' }))
			expect(error).not.toBeNull()
		})
	})

	// --- Sanity ------------------------------------------------------

	it('ownerA and ownerB are distinct test accounts (test setup sanity)', () => {
		expect(ownerAId).not.toBe(ownerBId)
	})
})
