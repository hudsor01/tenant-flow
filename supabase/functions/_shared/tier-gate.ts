// Tier-entitlement helper for paid-feature gates.
//
// Usage:
//   const gate = await checkTierEntitlement(req, supabase, userId, {
//     feature: 'esign',
//     upgrade_source: 'esign_gate',
//     entitled_plans: GROWTH_AND_MAX_PLANS,
//   })
//   if (gate) return gate   // 402 Response — forward to caller
//
// Returns `null` when entitled. Returns a 402/500 Response when not entitled
// or when the lookup fails. On 402, writes one row to `public.gate_events`
// so admin analytics can count gate hits vs. resulting subscriptions.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getJsonHeaders } from './cors.ts'
import { captureWebhookError } from './errors.ts'

const ACTIVE_SUB_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing'])

// Live Tenant Flow price IDs + lookup-key fallbacks for Growth and Max.
// Exported so each feature gate can reuse when it requires Growth+ tier.
export const GROWTH_AND_MAX_PLANS: ReadonlySet<string> = new Set([
  // Growth
  'price_1SPGCNP3WCR53SdorjDpiSy5', 'price_1SPGCRP3WCR53SdonqLUTJgK',
  // Max
  'price_1Rd16pP3WCR53SdoCh3oJlDl', 'price_1Rd17AP3WCR53SdoTB4FTbSq',
  // Lookup-key fallbacks
  'growth', 'growth_monthly', 'growth_annual',
  'max', 'max_monthly', 'max_annual',
])

export interface TierGateConfig {
  /** Feature key (e.g. 'esign', 'premium_reports'). Stored in gate_events. */
  feature: string
  /**
   * Source tag that flows through `/billing/plans?source=<x>` into
   * Stripe Checkout session/subscription metadata. Used by admin analytics
   * to attribute upgrades back to the gate that triggered them.
   * Must match `^[a-z_]+$`, <= 64 chars.
   */
  upgrade_source: string
  /** Set of Stripe price IDs or lookup_keys that count as entitled. */
  entitled_plans: ReadonlySet<string>
}

export async function checkTierEntitlement(
  req: Request,
  supabase: SupabaseClient,
  userId: string,
  config: TierGateConfig,
): Promise<Response | null> {
  const jsonHeaders = getJsonHeaders(req)

  const { data: ownerSub, error: subErr } = await supabase
    .from('users')
    .select('subscription_status, subscription_plan')
    .eq('id', userId)
    .single()

  if (subErr) {
    captureWebhookError(subErr, {
      message: `Tier-gate subscription lookup failed (${config.feature})`,
      user_id: userId,
    })
    return new Response(
      JSON.stringify({ error: 'Unable to verify subscription' }),
      { status: 500, headers: jsonHeaders },
    )
  }

  const ownerStatus = (ownerSub?.subscription_status as string | null) ?? null
  const ownerPlan = (ownerSub?.subscription_plan as string | null) ?? null
  const hasActiveSub = !!ownerStatus && ACTIVE_SUB_STATUSES.has(ownerStatus)
  const onEntitledPlan = !!ownerPlan && config.entitled_plans.has(ownerPlan)

  if (hasActiveSub && onEntitledPlan) return null

  // Record the gate hit for admin analytics. Non-blocking — if the insert
  // fails (e.g. RLS mismatch), log it but still return the 402 to the user.
  supabase
    .from('gate_events')
    .insert({
      user_id: userId,
      feature: config.feature,
      current_plan: ownerPlan,
      current_status: ownerStatus,
    })
    .then(({ error }) => {
      if (error) {
        captureWebhookError(error, {
          message: `gate_events insert failed (${config.feature})`,
          user_id: userId,
        })
      }
    })

  return new Response(
    JSON.stringify({
      error: `This feature requires a Growth or Max subscription.`,
      upgrade_required: true,
      upgrade_url: `/billing/plans?source=${config.upgrade_source}`,
      current_plan: ownerPlan,
      current_status: ownerStatus,
    }),
    { status: 402, headers: jsonHeaders },
  )
}
