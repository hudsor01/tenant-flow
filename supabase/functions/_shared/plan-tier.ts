// Single source of truth for Stripe price ID → tier-slug normalization.
//
// The Stripe webhook handlers (`checkout-session-completed.ts`,
// `customer-subscription-updated.ts`) used to write
// `subscription_plan: planLookup ?? priceId` directly to `users`. None of our
// live Stripe prices have `lookup_key` set, so every paying customer's
// `subscription_plan` ended up as the raw price ID (e.g.
// `price_1RtWFcP3WCR53SdoCxiVldhb`). The DB plan-limit triggers then matched
// against tier slugs (`'starter' / 'growth' / 'max'`) and silently dropped
// every paying customer back to the trial cap. This helper resolves the price
// ID to the tier slug so triggers and tier-gate code see a stable value.
//
// Source IDs mirror `src/config/pricing.ts` (single source of truth for the
// frontend pricing surface) — keep them in lockstep.

const STARTER_PRICE_IDS: ReadonlySet<string> = new Set([
  'price_1RtWFcP3WCR53SdoCxiVldhb', // Starter monthly $29
  'price_1RtWFdP3WCR53SdoArRRXYrL', // Starter annual  $290
])

const GROWTH_PRICE_IDS: ReadonlySet<string> = new Set([
  'price_1SPGCNP3WCR53SdorjDpiSy5', // Growth monthly $79
  'price_1SPGCRP3WCR53SdonqLUTJgK', // Growth annual  $790
])

const MAX_PRICE_IDS: ReadonlySet<string> = new Set([
  'price_1Rd16pP3WCR53SdoCh3oJlDl', // Max monthly $199
  'price_1Rd17AP3WCR53SdoTB4FTbSq', // Max annual  $2189
])

const TRIAL_PRICE_IDS: ReadonlySet<string> = new Set([
  'price_1RgguDP3WCR53Sdo1lJmjlD5', // Trial $0 (DB-managed; Stripe trial sub never created)
])

export type PlanTier = 'trial' | 'starter' | 'growth' | 'max'

/**
 * Resolve a Stripe price ID OR existing tier-slug to the canonical tier slug.
 * Accepts and normalizes:
 *   - Live Stripe price IDs (`price_*`) → tier slug
 *   - Pre-normalized tier slugs (`'Starter'`, `'GROWTH'`, `'tenantflow_max'`)
 *   - `null` / `undefined` / unknown values → `null` (caller decides default)
 *
 * Returns `null` for unknown values rather than throwing — the caller logs and
 * the DB trigger falls back to the trial cap, which is the safe default.
 */
export function priceIdToTier(value: string | null | undefined): PlanTier | null {
  if (!value) return null

  if (TRIAL_PRICE_IDS.has(value)) return 'trial'
  if (STARTER_PRICE_IDS.has(value)) return 'starter'
  if (GROWTH_PRICE_IDS.has(value)) return 'growth'
  if (MAX_PRICE_IDS.has(value)) return 'max'

  // Already a normalized slug? Accept any case + the legacy `tenantflow_max`.
  switch (value.toLowerCase()) {
    case 'trial':
      return 'trial'
    case 'starter':
      return 'starter'
    case 'growth':
      return 'growth'
    case 'max':
    case 'tenantflow_max':
      return 'max'
    default:
      return null
  }
}
