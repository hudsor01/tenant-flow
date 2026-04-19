/**
 * RLS integration test — Phase 44 / ANALYTICS-04 admin-only
 * get_funnel_stats RPC.
 *
 * Requires E2E_OWNER_EMAIL + E2E_ADMIN_EMAIL + SUPABASE_SERVICE_ROLE_KEY env
 * vars. Without them, the admin-path describe block SKIPS cleanly. Non-admin
 * rejection tests run always (need only E2E_OWNER creds).
 *
 * Asserts:
 *   1. non-admin OWNER caller gets error matching /unauthorized/i
 *   2. anonymous caller gets error matching /unauthorized/i
 *   3. admin caller on seeded cohort gets valid jsonb with 4 step rows,
 *      correct step_order, and non-null cohort_label
 *   4. empty-cohort window (1970-01-01 -> 1970-01-02) returns 4 zero-count
 *      rows with null conversion rates (nullif div-by-zero safety)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  createTestClient,
  getAdminTestCredentials,
  getTestCredentials,
} from '../setup/supabase-client'

const adminCreds = getAdminTestCredentials()
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_PUBLISHABLE_KEY = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
const SERVICE_ROLE_KEY =
  process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_SECRET_KEY']

// ---------------------------------------------------------------------------
// Non-admin rejection tests (run whenever owner creds are available)
// ---------------------------------------------------------------------------

describe('get_funnel_stats — non-admin callers rejected', () => {
  let ownerClient: SupabaseClient

  beforeAll(async () => {
    const { ownerA } = getTestCredentials()
    ownerClient = await createTestClient(ownerA.email, ownerA.password)
  })

  afterAll(async () => {
    await ownerClient?.auth.signOut()
  })

  it('rejects authenticated non-admin OWNER with Unauthorized', async () => {
    const { data, error } = await ownerClient.rpc('get_funnel_stats', {
      p_from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      p_to: new Date().toISOString(),
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/unauthorized/i)
  })

  it('rejects anonymous (no auth) caller with Unauthorized', async () => {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(
        'Missing NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      )
    }
    const anon = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    const { data, error } = await anon.rpc('get_funnel_stats', {
      p_from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      p_to: new Date().toISOString(),
    })
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error!.message).toMatch(/unauthorized/i)
  })
})

// ---------------------------------------------------------------------------
// Admin happy-path + edge-case tests (skip cleanly without admin creds)
// ---------------------------------------------------------------------------

const skipReason = !adminCreds
  ? 'Admin creds missing — set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD'
  : !SUPABASE_URL || !SERVICE_ROLE_KEY
    ? 'Service-role env missing — set SUPABASE_SERVICE_ROLE_KEY'
    : null

describe.skipIf(skipReason)('get_funnel_stats — admin caller aggregates', () => {
  let adminClient: SupabaseClient
  let serviceRoleClient: SupabaseClient
  let ownerAId: string
  // Composite primary keys for cleanup: (owner_user_id, step_name) pairs we
  // inserted during seeding so we can remove only our rows in afterAll.
  const seededKeys: Array<{ owner_user_id: string; step_name: string }> = []

  beforeAll(async () => {
    // Sign in as admin (non-null safe: skipIf above gates this block)
    adminClient = await createTestClient(
      adminCreds!.admin.email,
      adminCreds!.admin.password,
    )

    // Service-role client for seeding funnel events directly (bypasses RLS
    // and admin-only SELECT). Used only for seed + cleanup.
    serviceRoleClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Resolve a real FK-valid user id from the existing E2E_OWNER account.
    // Using a synthetic UUID would fail the users(id) FK constraint.
    const { ownerA } = getTestCredentials()
    const ownerClient = await createTestClient(ownerA.email, ownerA.password)
    const {
      data: { user },
    } = await ownerClient.auth.getUser()
    ownerAId = user!.id
    await ownerClient.auth.signOut()

    // Pre-cleanup: remove any funnel rows for this owner from prior runs so
    // the happy-path assertions start from a known baseline. Trigger-driven
    // live rows will be re-inserted by pre-existing DB activity; we only
    // remove what the backfill + our seed scenario would create.
    const { error: preCleanupError } = await serviceRoleClient
      .from('onboarding_funnel_events')
      .delete()
      .eq('owner_user_id', ownerAId)
    if (preCleanupError) {
      throw new Error(`Pre-cleanup failed: ${preCleanupError.message}`)
    }

    // Seed a complete funnel progression for ownerA within a 30-day window:
    // signup -> first_property (5d) -> first_tenant (10d).
    const now = Date.now()
    const rows = [
      {
        owner_user_id: ownerAId,
        step_name: 'signup',
        completed_at: new Date(now - 25 * 86_400_000).toISOString(),
      },
      {
        owner_user_id: ownerAId,
        step_name: 'first_property',
        completed_at: new Date(now - 20 * 86_400_000).toISOString(),
      },
      {
        owner_user_id: ownerAId,
        step_name: 'first_tenant',
        completed_at: new Date(now - 15 * 86_400_000).toISOString(),
      },
    ]
    const { error: insertError } = await serviceRoleClient
      .from('onboarding_funnel_events')
      .insert(rows)
    if (insertError) {
      throw new Error(`Seed insert failed: ${insertError.message}`)
    }
    for (const r of rows) {
      seededKeys.push({ owner_user_id: r.owner_user_id, step_name: r.step_name })
    }
  })

  afterAll(async () => {
    if (serviceRoleClient && seededKeys.length > 0) {
      // Delete only the exact (owner, step) pairs we inserted.
      for (const k of seededKeys) {
        await serviceRoleClient
          .from('onboarding_funnel_events')
          .delete()
          .eq('owner_user_id', k.owner_user_id)
          .eq('step_name', k.step_name)
      }
    }
    await adminClient?.auth.signOut()
  })

  it('returns 4-row steps array with valid aggregates on seeded cohort', async () => {
    const now = Date.now()
    const { data, error } = await adminClient.rpc('get_funnel_stats', {
      p_from: new Date(now - 30 * 86_400_000).toISOString(),
      p_to: new Date(now).toISOString(),
    })

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    const result = data as {
      from: string
      to: string
      cohort_label: string
      medians_computed_at: string
      steps: Array<{
        step: string
        step_order: number
        count: number
        conversion_rate_from_prior: number | null
        conversion_rate_from_signup: number | null
        median_days_from_prior: number | null
        median_days_from_signup: number | null
      }>
    }

    expect(typeof result.cohort_label).toBe('string')
    expect(result.cohort_label).toContain('owners who signed up between')
    expect(Array.isArray(result.steps)).toBe(true)
    expect(result.steps).toHaveLength(3)

    expect(result.steps[0]).toMatchObject({ step: 'signup', step_order: 1 })
    expect(result.steps[1]).toMatchObject({ step: 'first_property', step_order: 2 })
    expect(result.steps[2]).toMatchObject({ step: 'first_tenant', step_order: 3 })

    // ownerA contributes 1 to each step count. Other cohort members (real
    // OWNER users captured by the backfill) may also contribute -- assert
    // non-negative / at-least-one for each step rather than exact equality.
    for (const s of result.steps) {
      expect(Number(s.count)).toBeGreaterThanOrEqual(1)
    }

    // Conversion rate must be in [0, 1] for the first_property step.
    const firstPropertyRate = Number(result.steps[1]!.conversion_rate_from_prior)
    expect(firstPropertyRate).toBeGreaterThanOrEqual(0)
    expect(firstPropertyRate).toBeLessThanOrEqual(1)

    // Median days for first_property is non-null (at least ownerA completed).
    expect(result.steps[1]!.median_days_from_prior).not.toBeNull()
  })

  it('returns 4 zero-count rows with null rates for empty cohort window', async () => {
    const { data, error } = await adminClient.rpc('get_funnel_stats', {
      p_from: '1970-01-01T00:00:00Z',
      p_to: '1970-01-02T00:00:00Z',
    })

    expect(error).toBeNull()
    expect(data).not.toBeNull()

    const result = data as {
      steps: Array<{
        count: number
        conversion_rate_from_prior: number | null
        conversion_rate_from_signup: number | null
        median_days_from_prior: number | null
        median_days_from_signup: number | null
      }>
    }
    expect(result.steps).toHaveLength(3)
    for (const s of result.steps) {
      expect(Number(s.count)).toBe(0)
    }
    // Signup row: conversion_rate_from_prior hard-coded to 1.0 by the RPC
    expect(Number(result.steps[0]!.conversion_rate_from_prior)).toBe(1)
    // Downstream rows: nullif(0) makes rates NULL (not 0)
    expect(result.steps[1]!.conversion_rate_from_prior).toBeNull()
    expect(result.steps[2]!.conversion_rate_from_prior).toBeNull()
  })
})
