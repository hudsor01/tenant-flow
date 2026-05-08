/**
 * Integration tests pinning the EXECUTE-grant state of two admin-only
 * RPCs that were tightened in PR #677 (P1-2 + P1-6 from the 2026-05-07
 * security audit) and corrected in the cycle-1 followup.
 *
 * Migrations:
 *   - 20260507191140_p1_security_hardening.sql (P1-2 + P1-6 revokes)
 *   - 20260507210516_p1_security_review_followups.sql (P1-A: restore
 *     service_role EXECUTE on check_stripe_sync_status that the prior
 *     migration's `REVOKE FROM public` accidentally took away)
 *
 * These tests pin two contracts:
 *
 * authenticated callers cannot reach either RPC. PostgREST surfaces a
 * revoked EXECUTE on a SECURITY DEFINER function as 42501 in current
 * versions (older variants returned 42883 / PGRST202). Accept any of
 * the three so the test pins "function is unreachable from
 * authenticated", not a specific error-code string.
 *
 * Note: PGRST202 ("function not found via PostgREST schema cache")
 * also fires if the function were genuinely dropped from the schema —
 * so this test's contract is "authenticated cannot CALL these
 * functions", not "these functions exist". A separate test (or DB
 * advisory) should pin existence + ownership if that becomes a
 * concern.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('admin RPC grants — authenticated cannot reach revoked admin functions', () => {
	let clientA: SupabaseClient
	let clientB: SupabaseClient

	beforeAll(async () => {
		// Dual-client per the project's RLS-test convention. The contract
		// under test is role-level (`authenticated` ROLE has no EXECUTE),
		// not user-level, so a single user is logically sufficient — but
		// using both ownerA and ownerB also catches the unlikely case
		// where one synthetic owner has anomalous EXECUTE through some
		// other path while the other doesn't.
		const { ownerA, ownerB } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
		clientB = await createTestClient(ownerB.email, ownerB.password)
	})

	it('check_stripe_sync_status: revoked from ownerA', async () => {
		const { error } = await clientA.rpc('check_stripe_sync_status')
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})

	it('check_stripe_sync_status: revoked from ownerB', async () => {
		const { error } = await clientB.rpc('check_stripe_sync_status')
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})

	it('get_user_id_by_stripe_customer: revoked from ownerA', async () => {
		const { error } = await clientA.rpc('get_user_id_by_stripe_customer', {
			p_stripe_customer_id: 'cus_does_not_matter'
		})
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})

	it('get_user_id_by_stripe_customer: revoked from ownerB', async () => {
		const { error } = await clientB.rpc('get_user_id_by_stripe_customer', {
			p_stripe_customer_id: 'cus_does_not_matter'
		})
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})
})
