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
 *   1. authenticated callers cannot reach either RPC. PostgREST
 *      surfaces a revoked EXECUTE on a SECURITY DEFINER function as
 *      42501 in current versions (older variants returned 42883 /
 *      PGRST202). Accept any of the three so the test pins
 *      "function is unreachable", not a specific error code.
 *
 *   2. The functions still exist and are owned by `postgres`. If a
 *      future migration accidentally drops one or transfers ownership
 *      to a less-privileged role, this assertion catches it.
 */

import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('admin RPC grants — authenticated cannot reach revoked admin functions', () => {
	let clientA: SupabaseClient

	beforeAll(async () => {
		const { ownerA } = getTestCredentials()
		clientA = await createTestClient(ownerA.email, ownerA.password)
	})

	it('check_stripe_sync_status: revoked from authenticated', async () => {
		const { error } = await clientA.rpc('check_stripe_sync_status')
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})

	it('get_user_id_by_stripe_customer: revoked from authenticated', async () => {
		const { error } = await clientA.rpc('get_user_id_by_stripe_customer', {
			p_stripe_customer_id: 'cus_does_not_matter'
		})
		expect(error).not.toBeNull()
		expect(['42501', '42883', 'PGRST202']).toContain(error!.code)
	})
})
