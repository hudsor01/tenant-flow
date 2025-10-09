/**
 * Supabase RPC Analytics Integration Test
 *
 * This test verifies that all analytics-related RPC endpoints are callable and return expected results.
 * It also ensures that the test database is seeded with required data for analytics queries.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL as string
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string
const supabase = createClient(supabaseUrl, supabaseKey)

describe('Supabase Analytics RPC Endpoints', () => {
  // Example analytics RPCs to test
  const analyticsRpcs = [
    'get_property_occupancy',
    'get_rent_collection_stats',
    'get_maintenance_summary',
    // Add more analytics RPCs as needed
  ]

  analyticsRpcs.forEach((rpc) => {
    it(`should call ${rpc} and return data`, async () => {
      const { data, error } = await supabase.rpc(rpc, {})
      expect(error).toBeNull()
      expect(data).toBeDefined()
      // Optionally: check data shape or required fields
    })
  })

  it('should have seeded analytics data for test tenant', async () => {
    // Example: check at least one property exists for the seeded test tenant
    const { data, error } = await supabase
      .from('Property')
      .select('*')
      .eq('tenantId', process.env.SUPABASE_RPC_TEST_USER_ID)
      .limit(1)
    expect(error).toBeNull()
    expect(data && data.length).toBeGreaterThan(0)
  })
})
