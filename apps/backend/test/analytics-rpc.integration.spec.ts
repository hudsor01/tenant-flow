/**
 * Supabase RPC Analytics Integration Test
 *
 * This test verifies that all analytics-related RPC endpoints are callable and return expected results.
 * It also ensures that the test database is seeded with required data for analytics queries.
 *
 * NOTE: These tests require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_RPC_TEST_USER_ID
 * to be set in the environment. They will be skipped if not configured.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const testUserId = process.env.SUPABASE_RPC_TEST_USER_ID

const supabase =
	supabaseUrl && supabaseKey
		? createClient(supabaseUrl, supabaseKey)
		: undefined

const describeOrSkip =
	supabaseUrl && supabaseKey && testUserId ? describe : describe.skip

describeOrSkip('Supabase Analytics RPC Endpoints', () => {
	// Example analytics RPCs to test
	const analyticsRpcs = [
		'get_property_occupancy',
		'get_rent_collection_stats',
		'get_maintenance_summary'
		// Add more analytics RPCs as needed
	]

	analyticsRpcs.forEach(rpc => {
		it(`should call ${rpc} and return data`, async () => {
			if (!supabase) {
				throw new Error('Supabase client not initialized')
			}
			const { data, error } = await supabase.rpc(rpc, {})
			expect(error).toBeNull()
			expect(data).toBeDefined()
			// Optionally: check data shape or required fields
		})
	})

	it('should have seeded analytics data for test user', async () => {
		if (!supabase || !testUserId) {
			throw new Error('Supabase client or test user ID not configured')
		}
		// Example: check at least one property exists for the seeded test user
		const { data, error } = await supabase
			.from('property')
			.select('*')
			.eq('ownerId', testUserId)
			.limit(1)
		expect(error).toBeNull()
		expect(data && data.length).toBeGreaterThan(0)
	})
})
