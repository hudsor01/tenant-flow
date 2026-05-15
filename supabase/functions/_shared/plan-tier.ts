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
	"price_1TVTaAP3WCR53SdoYMUZN7Vf", // Starter monthly $19
	"price_1TVTaEP3WCR53Sdo7pbg6BCW", // Starter annual  $190
]);

const GROWTH_PRICE_IDS: ReadonlySet<string> = new Set([
	"price_1TVTaIP3WCR53SdoqnUe1Inv", // Growth monthly $49
	"price_1TVTaMP3WCR53SdoN4kufrVn", // Growth annual  $490
]);

const MAX_PRICE_IDS: ReadonlySet<string> = new Set([
	// Replaces Phase 1 CRIT-03 'Custom' placeholder
	"price_1TVTaQP3WCR53Sdo22VAYfhp", // Max monthly $149
	"price_1TVTaUP3WCR53Sdo5mnmSAmF", // Max annual  $1490
]);

const TRIAL_PRICE_IDS: ReadonlySet<string> = new Set([
	"price_1RgguDP3WCR53Sdo1lJmjlD5", // Trial $0 (DB-managed; Stripe trial sub never created)
]);

// Allowlist for `stripe-checkout`. The trial price is intentionally
// excluded — trials are DB-managed (`subscription_status='trialing'`,
// `trial_ends_at`) and never flow through Stripe Checkout.
//
// Used by stripe-checkout/index.ts to refuse a `price_id` that isn't in
// our canonical set, closing the path where an attacker (a) crafts a
// $0 price in some other Stripe account if test-mode keys ever leaked,
// or (b) pivots to a real-but-unintended price ID (e.g. a coupon or
// archived tier) and pairs it with `allow_promotion_codes: true` to
// gain dashboard access at a price never offered through the UI.
export const ALLOWED_CHECKOUT_PRICE_IDS: ReadonlySet<string> = new Set([
	...STARTER_PRICE_IDS,
	...GROWTH_PRICE_IDS,
	...MAX_PRICE_IDS,
]);

export type PlanTier = "trial" | "starter" | "growth" | "max";

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
export function priceIdToTier(
	value: string | null | undefined,
): PlanTier | null {
	if (!value) return null;

	if (TRIAL_PRICE_IDS.has(value)) return "trial";
	if (STARTER_PRICE_IDS.has(value)) return "starter";
	if (GROWTH_PRICE_IDS.has(value)) return "growth";
	if (MAX_PRICE_IDS.has(value)) return "max";

	// Already a normalized slug? Accept any case + the legacy `tenantflow_max`.
	switch (value.toLowerCase()) {
		case "trial":
			return "trial";
		case "starter":
			return "starter";
		case "growth":
			return "growth";
		case "max":
		case "tenantflow_max":
			return "max";
		default:
			return null;
	}
}
