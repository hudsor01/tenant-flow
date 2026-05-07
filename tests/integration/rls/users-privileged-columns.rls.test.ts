/**
 * Integration tests for the P0 security hardening on `public.users`.
 *
 * Migrations:
 *   - 20260507190024_lock_privileged_user_columns_and_p0_security.sql
 *   - 20260507194555_p0_security_review_followups.sql
 *
 * Pins five fixes (3 original P0s + 2 cycle-1 review P0s):
 *
 *   P0-1  An authenticated user can no longer self-promote to admin or
 *         flip their own subscription state. Two layers of defense:
 *           (a) column-level GRANT UPDATE was narrowed to a 10-column
 *               allowlist (REVOKE … FROM authenticated; GRANT (cols)
 *               TO authenticated). PostgREST refuses the write with
 *               42501 (insufficient_privilege).
 *           (b) BEFORE-UPDATE trigger `users_guard_self_update` (now
 *               SECURITY INVOKER, allowlist-based) raises 42501 if the
 *               jsonb projection of (NEW - allowed_cols) differs from
 *               (OLD - allowed_cols), i.e., any privileged column
 *               changed. The cycle-1 review caught that the original
 *               trigger was non-functional (SECURITY DEFINER + inverted
 *               check); both are corrected.
 *
 *   P0-2  `sign_lease_and_check_activation` is no longer EXECUTE-able
 *         from `authenticated` or PUBLIC. App code never calls it; lease
 *         signatures flow through the HMAC-protected `docuseal-webhook`
 *         which runs as service_role.
 *
 *   P0-3  The path-checkless INSERT policy on `storage.objects` for
 *         the `property-images` bucket was dropped. Only the strict
 *         `Property owners can upload images` policy remains. Owner A
 *         can upload to A's property folder; Owner B cannot upload to
 *         Owner A's property folder.
 *
 *   P0-A  Belt-and-braces trigger now actually fires. With grant drift
 *         simulated (re-grant `is_admin` to authenticated), an UPDATE
 *         attempting to set `is_admin=true` is blocked by the trigger
 *         with 42501. We assert the GRANT-layer rejection in the P0-1
 *         tests; the trigger-layer rejection can only be proved by
 *         re-granting which requires service-role and is therefore
 *         covered by the empirical reproduction in the migration's
 *         comment block, not a runtime test.
 *
 *   P0-B  REVOKE INSERT, DELETE on `public.users` from authenticated
 *         closes the delete-then-insert escalation path. PostgREST
 *         surfaces both as 42501.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

const PROBE_PROPERTY_NAME_PREFIX = 'RLS-probe-users-priv-'

interface SafeUserSnapshot {
	phone: string | null
	emergency_contact_name: string | null
	emergency_contact_phone: string | null
	emergency_contact_relationship: string | null
}

/** Type guard for the Supabase Storage error shape that exposes statusCode. */
function isStorageStatusError(
	value: unknown
): value is { statusCode: string | number; message?: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'statusCode' in value &&
		((typeof (value as { statusCode: unknown }).statusCode === 'string') ||
			(typeof (value as { statusCode: unknown }).statusCode === 'number'))
	)
}

describe('P0 security hardening — public.users + sign_lease + property-images storage', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient
	let ownerAId: string
	let ownerBId: string
	let savedSafeProfile: SafeUserSnapshot | null = null
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

		// Snapshot the safe-update columns so we can restore them after the
		// tests, even if a probe-write test crashes mid-flight. Keeping the
		// snapshot at suite scope (not test scope) means a single restore in
		// afterAll covers any orphan probe values.
		const { data: snap } = await clientA
			.from('users')
			.select(
				'phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship'
			)
			.eq('id', ownerAId)
			.single()
		savedSafeProfile = snap
			? {
					phone: snap.phone ?? null,
					emergency_contact_name: snap.emergency_contact_name ?? null,
					emergency_contact_phone: snap.emergency_contact_phone ?? null,
					emergency_contact_relationship:
						snap.emergency_contact_relationship ?? null
				}
			: null

		// Sweep any orphan probe properties from prior crashed runs so the
		// inserted-property cleanup converges. afterAll only knows about
		// IDs the test pushed before crashing.
		const { data: orphanProps } = await clientA
			.from('properties')
			.select('id')
			.eq('owner_user_id', ownerAId)
			.like('name', `${PROBE_PROPERTY_NAME_PREFIX}%`)
		for (const p of orphanProps ?? []) {
			await clientA.from('properties').delete().eq('id', p.id)
		}
	})

	afterAll(async () => {
		// Best-effort cleanup for storage objects this run uploaded.
		for (const path of uploadedStoragePaths) {
			await clientA.storage.from('property-images').remove([path])
		}
		// Best-effort cleanup for any properties this run created.
		for (const id of insertedPropertyIds) {
			await clientA.from('properties').delete().eq('id', id)
		}
		// Restore the safe profile columns back to the pre-suite values so
		// repeated runs don't drift the synthetic owner's profile.
		if (savedSafeProfile) {
			await clientA
				.from('users')
				.update(savedSafeProfile)
				.eq('id', ownerAId)
		}
	})

	async function ensureProbeProperty(): Promise<string> {
		const { data: prop, error: propErr } = await clientA
			.from('properties')
			.insert({
				name: `${PROBE_PROPERTY_NAME_PREFIX}${Date.now()}`,
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
		return prop!.id
	}

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

		it('rejects self-write of `status` column (P1-A — soft-delete-flag vector)', async () => {
			const { error } = await clientA
				.from('users')
				.update({ status: 'inactive' })
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('still allows safe self-updates (phone) — UX must not regress', async () => {
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
			// afterAll restores the original snapshot — no per-test restore.
		})

		it('still allows safe self-update of emergency_contact_* columns', async () => {
			const { error: writeError } = await clientA
				.from('users')
				.update({
					emergency_contact_name: 'Probe Name',
					emergency_contact_phone: '(555) 999-0000',
					emergency_contact_relationship: 'spouse'
				})
				.eq('id', ownerAId)
			expect(writeError).toBeNull()
			// afterAll restores the original snapshot.
		})
	})

	// --- P0-B ---------------------------------------------------------

	describe('P0-B: INSERT and DELETE on public.users from authenticated are revoked', () => {
		it('rejects INSERT on public.users (was the delete-then-insert escalation path)', async () => {
			const { error } = await clientA
				.from('users')
				.insert({
					id: ownerAId, // would conflict with own row, but rejected before that check
					email: 'attacker-reinsert@example.com',
					is_admin: true,
					full_name: 'Attacker'
				})
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})

		it('rejects DELETE on public.users (the first half of the delete-then-insert path)', async () => {
			const { error } = await clientA
				.from('users')
				.delete()
				.eq('id', ownerAId)
				.select()
			expect(error).not.toBeNull()
			expect(error!.code).toBe('42501')
		})
	})

	// --- P0-2 ---------------------------------------------------------

	describe('P0-2: sign_lease_and_check_activation is not callable from authenticated', () => {
		it('PostgREST returns permission-denied — EXECUTE is revoked', async () => {
			const { error } = await clientA.rpc('sign_lease_and_check_activation', {
				p_lease_id: '00000000-0000-0000-0000-000000000000',
				p_signer_type: 'owner',
				p_signature_ip: '127.0.0.1',
				p_signed_at: new Date().toISOString(),
				p_signature_method: 'in_app'
			})
			expect(error).not.toBeNull()
			// PostgREST surfaces a revoked EXECUTE on a SECURITY DEFINER
			// function as 42501 in current versions; older versions returned
			// 42883 / PGRST202. Accept any of the three so the test pins
			// "function is no longer reachable from authenticated", not a
			// specific error-code string.
			expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
		})
	})

	// --- P0-3 ---------------------------------------------------------

	describe('P0-3: property-images storage requires path-ownership', () => {
		it('owner can upload into a folder for a property they own', async () => {
			const propertyId = await ensureProbeProperty()
			const path = `${propertyId}/probe-${Date.now()}.jpg`
			const { error: upErr } = await clientA.storage
				.from('property-images')
				.upload(path, new Blob(['probe'], { type: 'image/jpeg' }))
			expect(upErr).toBeNull()
			uploadedStoragePaths.push(path)
		})

		it('owner B cannot upload into owner A property folder (was the P0-3 hole)', async () => {
			// Reuse the owned property from the previous test if available;
			// otherwise create one. Either way, the folder UUID resolves to a
			// property ownerA owns, which is what makes the cross-owner check
			// meaningful.
			const targetPropertyId =
				insertedPropertyIds[insertedPropertyIds.length - 1] ??
				(await ensureProbeProperty())

			const path = `${targetPropertyId}/cross-owner-${Date.now()}.jpg`
			const { error } = await clientB.storage
				.from('property-images')
				.upload(path, new Blob(['attack'], { type: 'image/jpeg' }))
			expect(error).not.toBeNull()

			// Pin the SHAPE of the rejection: storage returns a 4xx with an
			// RLS / unauthorized message. Loose `.toBeTruthy()` would also
			// pass on a transient network error, which would mask a real
			// regression.
			if (isStorageStatusError(error)) {
				const status = String(error.statusCode)
				expect(['400', '403']).toContain(status)
				expect(error.message ?? '').toMatch(
					/row-level security|unauthorized|new row violates|policy/i
				)
			} else {
				// Even if statusCode isn't surfaced (older client versions),
				// the message must mention the RLS rejection shape.
				expect(error!.message).toMatch(
					/row-level security|unauthorized|new row violates|policy/i
				)
			}
		})

		it('owner B cannot upload into a folder whose uuid does not exist (no implicit allow)', async () => {
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
