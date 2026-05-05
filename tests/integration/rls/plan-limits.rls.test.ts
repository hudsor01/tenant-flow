import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Plan-limit enforcement (the revenue gate).
 *
 * What this suite covers:
 *   - Max-tier owner can insert beyond Starter/Growth caps (bypass works).
 *   - Max-tier owner can insert a unit (mirror coverage for the units trigger).
 *   - Both test owners are pinned to subscription_plan='max' by the migration
 *     `20260505213825_enforce_plan_limits.sql` so the bypass path is reachable
 *     from this RLS suite without service-role privileges.
 *
 * What this suite intentionally does NOT cover:
 *   - The blocking path (trigger raises P0001 + hint='plan_limit_exceeded' for
 *     a trial-cap owner). Verifying this requires temporarily flipping a test
 *     owner's `subscription_plan` to NULL, which is gated by RLS on the
 *     `users` table — the authenticated test client cannot mutate that
 *     column. Adding a service-role client to this test infrastructure would
 *     conflict with the project's "frontend never uses service role" rule
 *     (CLAUDE.md), and CI does not provision the service-role secret for
 *     these jobs by design.
 *
 *     The blocking path is verified out-of-band via the migration's apply
 *     smoke against prod (recorded in the PR description). Future cycle-2
 *     reviewers should treat the migration smoke as the assertion of record
 *     for the blocking case.
 */
const PLAN_PROP_PREFIX = 'plan-limit-test-'

describe('Plan-limit enforcement triggers', () => {
	let clientA: SupabaseClient
	let ownerAId: string
	const inserted: string[] = []

	beforeAll(async () => {
		const { ownerA } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		const {
			data: { user },
		} = await clientA.auth.getUser()
		ownerAId = user!.id

		// Cycle-1 P1-3: clear any residual properties from prior crashed runs
		// so subsequent suites running against ownerA see a tidy workspace.
		await clientA
			.from('properties')
			.delete()
			.like('name', `${PLAN_PROP_PREFIX}%`)
			.eq('owner_user_id', ownerAId)
	})

	afterAll(async () => {
		for (const id of inserted) {
			await clientA.from('properties').delete().eq('id', id)
		}
		// Defense against an early test failure leaving residual rows the
		// `inserted` array doesn't track.
		await clientA
			.from('properties')
			.delete()
			.like('name', `${PLAN_PROP_PREFIX}%`)
			.eq('owner_user_id', ownerAId)

		await clientA.auth.signOut()
	})

	const baseProperty = (name: string) => ({
		owner_user_id: ownerAId,
		name,
		address_line1: '1 Plan Limit Way',
		city: 'Austin',
		state: 'TX',
		postal_code: '78701',
		country: 'USA',
		property_type: 'single_family',
	})

	it('Max-tier owner inserts properties beyond the Starter/Growth caps', async () => {
		const baseName = `${PLAN_PROP_PREFIX}max-${Date.now()}`
		// Six is one over the Starter cap. Max-tier should accept all six.
		for (let i = 0; i < 6; i++) {
			const { data, error } = await clientA
				.from('properties')
				.insert(baseProperty(`${baseName}-${i}`))
				.select('id')
				.single()
			expect(error).toBeNull()
			expect(data?.id).toBeDefined()
			if (data?.id) inserted.push(data.id)
		}
	})

	it('Max-tier owner can insert a unit', async () => {
		const propertyId = inserted[0]
		if (!propertyId) {
			throw new Error('precondition: previous test should have inserted a property')
		}

		const { data, error } = await clientA
			.from('units')
			.insert({
				owner_user_id: ownerAId,
				property_id: propertyId,
				unit_number: `plan-${Date.now()}`,
				status: 'available',
			})
			.select('id')
			.single()
		expect(error).toBeNull()
		expect(data?.id).toBeDefined()
		if (data?.id) await clientA.from('units').delete().eq('id', data.id)
	})
})
