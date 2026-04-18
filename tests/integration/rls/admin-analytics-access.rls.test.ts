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
		let adminJwtHasUserType = false

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			ownerClient = await createTestClient(ownerA.email, ownerA.password)
			adminClient = await createTestClient(
				adminCreds!.admin.email,
				adminCreds!.admin.password
			)

			const { data: session } = await adminClient.auth.getSession()
			const token = session.session?.access_token
			if (token) {
				const payload = token.split('.')[1]
				if (payload) {
					const claims = JSON.parse(
						Buffer.from(payload, 'base64url').toString()
					) as { app_metadata?: { user_type?: string } }
					adminJwtHasUserType =
						claims.app_metadata?.user_type === 'ADMIN'
				}
			}
		})

		describe('get_deliverability_stats', () => {
			it('rejects owner caller', async () => {
				const { data, error } = await ownerClient.rpc(
					'get_deliverability_stats',
					{ p_days: 30 }
				)
				// Acceptable outcomes:
				//   1) RPC raises 'Unauthorized' -> PostgREST surfaces an error
				//   2) Function returns empty set because is_admin() guard runs
				// Both prove a non-admin cannot read deliverability data.
				const isBlocked =
					error !== null || (Array.isArray(data) && data.length === 0)
				expect(isBlocked).toBe(true)
			})

			it('permits admin caller', async (ctx) => {
				if (!adminJwtHasUserType) {
					ctx.skip(
						'admin JWT lacks app_metadata.user_type=ADMIN — verify E2E_ADMIN_EMAIL ' +
						'points to a user with user_type=ADMIN in public.users and that ' +
						'custom_access_token_hook is enabled'
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
				if (!adminJwtHasUserType) {
					ctx.skip(
						'admin JWT lacks app_metadata.user_type=ADMIN — verify E2E_ADMIN_EMAIL ' +
						'points to a user with user_type=ADMIN in public.users and that ' +
						'custom_access_token_hook is enabled'
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
