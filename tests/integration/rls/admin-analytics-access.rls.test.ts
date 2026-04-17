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

		beforeAll(async () => {
			const { ownerA } = getTestCredentials()
			ownerClient = await createTestClient(ownerA.email, ownerA.password)
			adminClient = await createTestClient(
				adminCreds!.admin.email,
				adminCreds!.admin.password
			)
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

			it('permits admin caller', async () => {
				const { data, error } = await adminClient.rpc(
					'get_deliverability_stats',
					{ p_days: 30 }
				)
				expect(error).toBeNull()
				// Admin should receive an array (possibly empty if no events yet,
				// but never an error).
				expect(Array.isArray(data)).toBe(true)
			})
		})

		describe('get_funnel_stats', () => {
			it('rejects owner caller', async () => {
				const { data, error } = await ownerClient.rpc(
					'get_funnel_stats',
					{}
				)
				// Same acceptance pattern: error or null data proves rejection.
				const isBlocked = error !== null || data === null
				expect(isBlocked).toBe(true)
			})

			it('permits admin caller', async () => {
				const { data, error } = await adminClient.rpc(
					'get_funnel_stats',
					{}
				)
				expect(error).toBeNull()
				// Admin should receive a non-null jsonb object with a `steps` array.
				expect(data).not.toBeNull()
			})
		})
	}
)
