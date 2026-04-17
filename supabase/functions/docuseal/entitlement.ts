// E-sign tier entitlement check.
// Gates DocuSeal send-for-signature behind Growth/Max subscriptions.
// Returns a Response to short-circuit the caller, or null to allow the action
// through. Keeps the handler.ts dispatcher clean — all tier logic lives here.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getJsonHeaders } from '../_shared/cors.ts'
import { captureWebhookError } from '../_shared/errors.ts'

// Live Tenant Flow price IDs for Growth and Max tiers.
// Also includes lookup_key fallbacks in case Stripe prices gain lookup_keys
// later (the webhook stores `price.lookup_key ?? price.id` in subscription_plan).
const ESIGN_ENTITLED_PLANS: ReadonlySet<string> = new Set([
  // Growth price IDs
  'price_1SPGCNP3WCR53SdorjDpiSy5', 'price_1SPGCRP3WCR53SdonqLUTJgK',
  // Max price IDs
  'price_1Rd16pP3WCR53SdoCh3oJlDl', 'price_1Rd17AP3WCR53SdoTB4FTbSq',
  // Lookup-key fallbacks
  'growth', 'growth_monthly', 'growth_annual',
  'max', 'max_monthly', 'max_annual',
])

const ACTIVE_SUB_STATUSES: ReadonlySet<string> = new Set(['active', 'trialing'])

/**
 * Check whether the authenticated owner has an active Growth or Max subscription.
 * - Returns `null` if entitled (caller proceeds).
 * - Returns a 402 Response with `upgrade_required: true` if not entitled.
 * - Returns a 500 Response if the subscription lookup itself fails.
 *
 * Only called from the `send-for-signature` action. In-flight signatures
 * (sign-owner, sign-tenant, cancel, resend) remain ungated so users can
 * complete or cancel after downgrade.
 *
 * Takes `req` so responses carry the same CORS + JSON headers as every other
 * response path in handler.ts (browser callers from FRONTEND_URL would
 * otherwise reject the 402 due to missing Access-Control-Allow-Origin).
 */
export async function checkESignEntitlement(
  supabase: SupabaseClient,
  userId: string,
  req: Request,
): Promise<Response | null> {
  const jsonHeaders = getJsonHeaders(req)

  const { data: ownerSub, error: subErr } = await supabase
    .from('users')
    .select('subscription_status, subscription_plan')
    .eq('id', userId)
    .single()

  if (subErr) {
    captureWebhookError(subErr, {
      message: 'Error fetching subscription for e-sign tier check',
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
  const onEntitledPlan = !!ownerPlan && ESIGN_ENTITLED_PLANS.has(ownerPlan)

  if (!hasActiveSub || !onEntitledPlan) {
    return new Response(
      JSON.stringify({
        error: 'E-signing requires a Growth or Max subscription.',
        upgrade_required: true,
        current_plan: ownerPlan,
        current_status: ownerStatus,
      }),
      { status: 402, headers: jsonHeaders },
    )
  }

  return null
}
