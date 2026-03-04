import { createTestClient, getTestCredentials } from '../setup/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('RPC auth isolation — cross-user access denied', () => {
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let ownerAId: string
  let ownerBId: string

  beforeAll(async () => {
    const { ownerA, ownerB } = getTestCredentials()
    clientA = await createTestClient(ownerA.email, ownerA.password)
    clientB = await createTestClient(ownerB.email, ownerB.password)

    const {
      data: { user: userA },
    } = await clientA.auth.getUser()
    const {
      data: { user: userB },
    } = await clientB.auth.getUser()
    ownerAId = userA!.id
    ownerBId = userB!.id
  })

  afterAll(async () => {
    await clientA.auth.signOut()
    await clientB.auth.signOut()
  })

  // ---------------------------------------------------------------------------
  // Helper: assert cross-user RPC call is rejected
  // ---------------------------------------------------------------------------

  function expectAccessDenied(result: { data: unknown; error: unknown }) {
    // After guards are added, we expect an error with "Access denied"
    expect(result.error).not.toBeNull()
    expect((result.error as { message: string }).message).toMatch(/access denied/i)
  }

  // ---------------------------------------------------------------------------
  // Dashboard group
  // ---------------------------------------------------------------------------

  it('rejects get_dashboard_stats with another user ID', async () => {
    const result = await clientA.rpc('get_dashboard_stats', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_dashboard_data_v2 with another user ID', async () => {
    const result = await clientA.rpc('get_dashboard_data_v2', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_dashboard_time_series with another user ID', async () => {
    const result = await clientA.rpc('get_dashboard_time_series', {
      p_user_id: ownerBId,
      p_metric_name: 'occupancy_rate',
      p_days: 7,
    })
    expectAccessDenied(result)
  })

  it('rejects get_metric_trend with another user ID', async () => {
    const result = await clientA.rpc('get_metric_trend', {
      p_user_id: ownerBId,
      p_metric_name: 'occupancy_rate',
      p_period: 'month',
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Analytics group
  // ---------------------------------------------------------------------------

  it('rejects get_billing_insights with another user ID', async () => {
    const result = await clientA.rpc('get_billing_insights', {
      owner_id_param: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_maintenance_analytics with another user ID', async () => {
    const result = await clientA.rpc('get_maintenance_analytics', {
      user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_expense_summary with another user ID', async () => {
    const result = await clientA.rpc('get_expense_summary', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_financial_overview with another user ID', async () => {
    const result = await clientA.rpc('get_financial_overview', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_invoice_statistics with another user ID', async () => {
    const result = await clientA.rpc('get_invoice_statistics', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Property group
  // ---------------------------------------------------------------------------

  it('rejects get_property_performance_cached with another user ID', async () => {
    const result = await clientA.rpc('get_property_performance_cached', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_property_performance_trends with another user ID', async () => {
    const result = await clientA.rpc('get_property_performance_trends', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_property_performance_with_trends with another user ID', async () => {
    const result = await clientA.rpc('get_property_performance_with_trends', {
      p_user_id: ownerBId,
      p_timeframe: '30d',
      p_limit: 10,
    })
    expectAccessDenied(result)
  })

  it('rejects get_property_performance_analytics with another user ID', async () => {
    const result = await clientA.rpc('get_property_performance_analytics', {
      p_user_id: ownerBId,
      p_timeframe: '30d',
    })
    expectAccessDenied(result)
  })

  it('rejects search_properties with another user ID', async () => {
    const result = await clientA.rpc('search_properties', {
      p_user_id: ownerBId,
      p_search_term: 'test',
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Trends group
  // ---------------------------------------------------------------------------

  it('rejects get_occupancy_trends_optimized with another user ID', async () => {
    const result = await clientA.rpc('get_occupancy_trends_optimized', {
      p_owner_id: ownerBId,
      p_months: 6,
    })
    expectAccessDenied(result)
  })

  it('rejects get_revenue_trends_optimized with another user ID', async () => {
    const result = await clientA.rpc('get_revenue_trends_optimized', {
      p_user_id: ownerBId,
      p_months: 6,
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // User group
  // ---------------------------------------------------------------------------

  it('rejects get_user_profile with another user ID', async () => {
    const result = await clientA.rpc('get_user_profile', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_user_dashboard_activities with another user ID', async () => {
    const result = await clientA.rpc('get_user_dashboard_activities', {
      p_user_id: ownerBId,
      p_limit: 5,
      p_offset: 0,
    })
    expectAccessDenied(result)
  })

  it('rejects get_user_sessions with another user ID', async () => {
    const result = await clientA.rpc('get_user_sessions', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects get_user_plan_limits with another user ID', async () => {
    const result = await clientA.rpc('get_user_plan_limits', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects check_user_feature_access with another user ID', async () => {
    const result = await clientA.rpc('check_user_feature_access', {
      p_user_id: ownerBId,
      p_feature: 'basic_properties',
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Billing group
  // ---------------------------------------------------------------------------

  it('rejects get_stripe_customer_by_user_id with another user ID', async () => {
    const result = await clientA.rpc('get_stripe_customer_by_user_id', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects revoke_user_session with another user ID', async () => {
    const result = await clientA.rpc('revoke_user_session', {
      p_user_id: ownerBId,
      p_session_id: '00000000-0000-0000-0000-000000000000',
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Metrics group
  // ---------------------------------------------------------------------------

  it('rejects calculate_maintenance_metrics with another user ID', async () => {
    const result = await clientA.rpc('calculate_maintenance_metrics', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  it('rejects calculate_monthly_metrics with another user ID', async () => {
    const result = await clientA.rpc('calculate_monthly_metrics', {
      p_user_id: ownerBId,
    })
    expectAccessDenied(result)
  })

  // ---------------------------------------------------------------------------
  // Positive controls — own-user calls succeed
  // ---------------------------------------------------------------------------

  it('allows get_dashboard_stats with own user ID', async () => {
    const result = await clientA.rpc('get_dashboard_stats', {
      p_user_id: ownerAId,
    })
    expect(result.error).toBeNull()
  })

  it('allows get_dashboard_data_v2 with own user ID', async () => {
    const result = await clientA.rpc('get_dashboard_data_v2', {
      p_user_id: ownerAId,
    })
    expect(result.error).toBeNull()
  })

  it('allows get_maintenance_analytics with own user ID', async () => {
    const result = await clientA.rpc('get_maintenance_analytics', {
      user_id: ownerAId,
    })
    expect(result.error).toBeNull()
  })

  it('allows get_user_profile with own user ID (no access denied)', async () => {
    const result = await clientA.rpc('get_user_profile', {
      p_user_id: ownerAId,
    })
    // The function may fail due to pre-existing schema issues (e.g., missing column),
    // but crucially it must NOT fail with "Access denied" — proving the guard passes
    if (result.error) {
      expect((result.error as { message: string }).message).not.toMatch(/access denied/i)
    }
  })
})
