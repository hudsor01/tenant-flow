import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
	createTestClient,
	getTestCredentials,
	getAdminTestCredentials
} from '../setup/supabase-client'

const adminCreds = getAdminTestCredentials()

describe.skipIf(!adminCreds)(
	'admin analytics RPCs reject non-admin callers',
	() => {
		let ownerClient: SupabaseClient
		let adminClient: SupabaseClient
		let adminIsReallyAdmin = false

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			ownerClient = await createTestClient(ownerA.email, ownerA.password)
			adminClient = await createTestClient(
				adminCreds!.admin.email,
				adminCreds!.admin.password
			)

			// Verify the authenticated admin user actually has is_admin=true in
			// public.users. If not, skip "permits admin" assertions so we don't
			// silently test the wrong user.
			const { data } = await adminClient
				.from('users')
				.select('is_admin')
				.limit(1)
				.maybeSingle()
			adminIsReallyAdmin = data?.is_admin === true
		})

		describe('get_deliverability_stats', () => {
			it('rejects owner caller', async () => {
				const { data, error } = await ownerClient.rpc(
					'get_deliverability_stats',
					{ p_days: 30 }
				)
				const isBlocked =
					error !== null || (Array.isArray(data) && data.length === 0)
				expect(isBlocked).toBe(true)
			})

			it('permits admin caller', async (ctx) => {
				if (!adminIsReallyAdmin) {
					ctx.skip(
						'E2E_ADMIN_EMAIL does not resolve to a user with is_admin=true in public.users'
					)
				}
				const { data, error } = await adminClient.rpc(
					'get_deliverability_stats',
					{ p_days: 30 }
				)
				expect(error).toBeNull()
				expect(Array.isArray(data)).toBe(true)
			})
		})

		describe('get_funnel_stats', () => {
			it('rejects owner caller', async () => {
				const { data, error } = await ownerClient.rpc(
					'get_funnel_stats',
					{}
				)
				const isBlocked = error !== null || data === null
				expect(isBlocked).toBe(true)
			})

			it('permits admin caller', async (ctx) => {
				if (!adminIsReallyAdmin) {
					ctx.skip(
						'E2E_ADMIN_EMAIL does not resolve to a user with is_admin=true in public.users'
					)
				}
				const { data, error } = await adminClient.rpc(
					'get_funnel_stats',
					{}
				)
				expect(error).toBeNull()
				expect(data).not.toBeNull()
			})
		})
	}
)
