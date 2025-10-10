import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isPropertyPerformanceRpcResponse } from '@repo/shared/types/database-rpc'
import type { Database } from '@repo/shared/types/supabase-generated'

const requiredEnv = [
	'SUPABASE_URL',
	'SUPABASE_SERVICE_ROLE_KEY',
	'SUPABASE_RPC_TEST_USER_ID'
] as const

const missingEnv = requiredEnv.filter(key => !process.env[key])
const describeSupabase = missingEnv.length > 0 ? describe.skip : describe

jest.setTimeout(30_000)

describeSupabase('Supabase RPC contract tests', () => {
	let client: SupabaseClient<Database>
	const supabaseUrl = process.env.SUPABASE_URL as string
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
	const userId = process.env.SUPABASE_RPC_TEST_USER_ID as string

	beforeAll(() => {
		client = createClient<Database>(supabaseUrl, serviceKey, {
			auth: {
				persistSession: false,
				autoRefreshToken: false
			}
		})
	})

	test('get_dashboard_stats returns structured payload', async () => {
		const { data, error } = await client.rpc('get_dashboard_stats', {
			user_id_param: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()

		const stats = data as Record<string, unknown>
		expect(stats).toHaveProperty('properties')
		expect(stats).toHaveProperty('tenants')
		expect(stats).toHaveProperty('revenue')
	})

	test('get_property_performance returns typed rows', async () => {
		const { data, error } = await client.rpc('get_property_performance', {
			p_user_id: userId
		})

		expect(error).toBeNull()
		expect(Array.isArray(data)).toBe(true)

		const rows = (data ?? []) as unknown[]
		if (rows.length > 0) {
			expect(isPropertyPerformanceRpcResponse(rows[0])).toBe(true)
		}
	})

	test('calculate_maintenance_metrics returns summary stats', async () => {
		const { data, error } = await client.rpc('calculate_maintenance_metrics', {
			p_user_id: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()

		const metrics = data as Record<string, unknown>
		expect(metrics).toHaveProperty('completion_rate')
		expect(metrics).toHaveProperty('avg_resolution_time')
	})

	test('get_maintenance_analytics responds with trend data', async () => {
		const { data, error } = await client.rpc('get_maintenance_analytics', {
			user_id: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()

		const analytics = data as Record<string, unknown>
		expect(analytics).toHaveProperty('trends_over_time')
		expect(analytics).toHaveProperty('priority_breakdown')
	})
})

if (missingEnv.length > 0) {
	// Test environment warning - intentionally using console
	process.stderr.write(
		`⚠️  Skipping Supabase RPC contract tests. Missing env: ${missingEnv.join(', ')}\n`
	)
}
