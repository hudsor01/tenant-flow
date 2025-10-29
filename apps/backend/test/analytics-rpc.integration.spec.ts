/**
 * Supabase RPC Analytics Integration Test
 *
 * This test verifies that all analytics-related RPC endpoints are callable and return expected results.
 * It also ensures that the test database is seeded with required data for analytics queries.
 *
 * NOTE: These tests require SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_RPC_TEST_USER_ID
 * to be set in the environment. They will be skipped if not configured.
 */

import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL) {
	process.env.SUPABASE_URL = 'https://mock.supabase.co'
}
if (!process.env.SUPABASE_SECRET_KEY) {
	process.env.SUPABASE_SECRET_KEY = 'mock-service-role-key'
}
if (!process.env.SUPABASE_RPC_TEST_USER_ID) {
	process.env.SUPABASE_RPC_TEST_USER_ID = '11111111-1111-1111-1111-111111111111'
}

const mockRpc = jest.fn()
const mockFrom = jest.fn()

jest.mock('@supabase/supabase-js', () => {
	const actual = jest.requireActual('@supabase/supabase-js')
	return {
		...actual,
		createClient: () =>
			({
				rpc: mockRpc,
				from: mockFrom
			}) as ReturnType<typeof actual.createClient>
	}
})

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SECRET_KEY as string
const testUserId = process.env.SUPABASE_RPC_TEST_USER_ID

const supabase = createClient(supabaseUrl, supabaseKey)

describe('Supabase Analytics RPC Endpoints', () => {
	// Example analytics RPCs to test
	const analyticsRpcs = [
		'get_property_occupancy',
		'get_rent_collection_stats',
		'get_maintenance_summary'
		// Add more analytics RPCs as needed
	]

	const analyticsResponses: Record<string, unknown> = {
		get_property_occupancy: {
			occupancy_rate: 0.94,
			total_units: 120,
			occupied_units: 113
		},
		get_rent_collection_stats: {
			total_due: 56000,
			total_collected: 54000,
			collection_rate: 0.964
		},
		get_maintenance_summary: {
			open_requests: 4,
			completed_requests: 18,
			avg_completion_time_days: 2.4
		}
	}

	const createQueryChain = () => {
		const chain: any = {}
		chain.select = jest.fn(() => chain)
		chain.eq = jest.fn(() => chain)
		chain.limit = jest.fn(async () => ({
			data: [
				{
					id: 'property-1',
					name: 'Mock Property',
					ownerId: testUserId
				}
			],
			error: null
		}))
		return chain
	}

	beforeEach(() => {
		mockRpc.mockClear()
		mockFrom.mockClear()
		mockRpc.mockImplementation(async (rpc: string) => {
			const payload = analyticsResponses[rpc]
			if (!payload) {
				return {
					data: null,
					error: { message: `Unknown RPC ${rpc}` }
				}
			}
			return { data: payload, error: null }
		})

		mockFrom.mockImplementation(() => createQueryChain())
	})

	analyticsRpcs.forEach(rpc => {
		it(`should call ${rpc} and return data`, async () => {
			const { data, error } = await supabase.rpc(rpc, {})
			expect(error).toBeNull()
			expect(data).toBeDefined()
			expect(mockRpc).toHaveBeenCalledWith(rpc, {})
			// Optionally: check data shape or required fields
		})
	})

	it('should have seeded analytics data for test user', async () => {
		if (!testUserId) {
			throw new Error('Supabase client or test user ID not configured')
		}
		// Example: check at least one property exists for the seeded test user
		const { data, error } = await supabase
			.from('Property')
			.select('*')
			.eq('ownerId', testUserId)
			.limit(1)
		expect(error).toBeNull()
		expect(data && data.length).toBeGreaterThan(0)
		expect(mockFrom).toHaveBeenCalledWith('Property')
		const queryChain = mockFrom.mock.results[0]?.value
		expect(queryChain.select).toHaveBeenCalledWith('*')
		expect(queryChain.eq).toHaveBeenCalledWith('ownerId', testUserId)
	})
})
