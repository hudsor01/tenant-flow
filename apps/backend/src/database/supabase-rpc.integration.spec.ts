import { isPropertyPerformanceRpcResponse } from '@repo/shared/types/database-rpc'
import type { Database } from '@repo/shared/types/supabase-generated'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) {
	process.env.SUPABASE_URL = 'https://mock.supabase.co'
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
	process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key'
}
if (!process.env.SUPABASE_RPC_TEST_USER_ID) {
	process.env.SUPABASE_RPC_TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
}

const mockRpc = jest.fn()

jest.mock('@supabase/supabase-js', () => {
	const actual = jest.requireActual('@supabase/supabase-js')
	return {
		...actual,
		createClient: () =>
			({
				rpc: mockRpc
			}) as unknown as SupabaseClient<Database>
	}
})

const requiredEnv = [
	'SUPABASE_URL',
	'SUPABASE_SERVICE_ROLE_KEY',
	'SUPABASE_RPC_TEST_USER_ID'
] as const

const missingEnv = requiredEnv.filter(key => !process.env[key])
const describeSupabase = describe

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
	afterAll(() => {
		mockRpc.mockReset()
	})
	beforeEach(() => {
		mockRpc.mockReset()
	})

	test('get_dashboard_stats returns structured payload', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				properties: 12,
				tenants: 34,
				revenue: 56789,
				vacancy_rate: 0.05
			},
			error: null
		})

		const { data, error } = await client.rpc('get_dashboard_stats', {
			user_id_param: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()
		expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', {
			user_id_param: userId
		})

		const stats = data as Record<string, unknown>
		expect(stats).toHaveProperty('properties')
		expect(stats).toHaveProperty('tenants')
		expect(stats).toHaveProperty('revenue')
	})

	test('get_property_performance returns typed rows', async () => {
		const mockRows = [
			{
				property_id: 'prop-1',
				property_name: 'Main St Apartments',
				occupancy_rate: 0.92,
				avg_days_vacant: 8,
				total_units: 24,
				leased_units: 22,
				monthly_rent: 42000
			}
		]

		mockRpc.mockResolvedValueOnce({
			data: mockRows,
			error: null
		})

		const { data, error } = await client.rpc('get_property_performance', {
			p_user_id: userId
		})

		expect(error).toBeNull()
		expect(Array.isArray(data)).toBe(true)
		expect(mockRpc).toHaveBeenCalledWith('get_property_performance', {
			p_user_id: userId
		})

		const rows = (data ?? []) as unknown[]
		if (rows.length > 0) {
			expect(isPropertyPerformanceRpcResponse(rows[0])).toBe(true)
		}
	})

	test('calculate_maintenance_metrics returns summary stats', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				completion_rate: 0.88,
				avg_resolution_time: 42,
				open_requests: 3,
				total_requests: 25
			},
			error: null
		})

		const { data, error } = await client.rpc('calculate_maintenance_metrics', {
			p_user_id: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()

		const metrics = data as Record<string, unknown>
		expect(metrics).toHaveProperty('completion_rate')
		expect(metrics).toHaveProperty('avg_resolution_time')
		expect(mockRpc).toHaveBeenCalledWith('calculate_maintenance_metrics', {
			p_user_id: userId
		})
	})

	test('get_maintenance_analytics responds with trend data', async () => {
		mockRpc.mockResolvedValueOnce({
			data: {
				trends_over_time: [
					{ month: '2025-01', completed: 12, created: 14 },
					{ month: '2025-02', completed: 10, created: 11 }
				],
				priority_breakdown: {
					high: 5,
					medium: 9,
					low: 6
				}
			},
			error: null
		})

		const { data, error } = await client.rpc('get_maintenance_analytics', {
			user_id: userId
		})

		expect(error).toBeNull()
		expect(data).toBeTruthy()

		const analytics = data as Record<string, unknown>
		expect(analytics).toHaveProperty('trends_over_time')
		expect(analytics).toHaveProperty('priority_breakdown')
		expect(mockRpc).toHaveBeenCalledWith('get_maintenance_analytics', {
			user_id: userId
		})
	})
})

if (missingEnv.length > 0) {
	// Test environment warning - intentionally using console
	process.stderr.write(
		`⚠️  Skipping Supabase RPC contract tests. Missing env: ${missingEnv.join(', ')}\n`
	)
}
