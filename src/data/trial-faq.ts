/**
 * What the 14-day free trial includes, in the words of the trial's own rules
 * (src/config/pricing.ts FREETRIAL: 1 property, 5 units; stripe-checkout
 * carries the remaining days into a chosen plan when more than two remain).
 * Lease e-sign is a Growth and Max feature: a trial without a chosen plan
 * can't send for signature (tier-gate), so no copy may say the trial
 * includes it. Shown on the home page and the pricing page.
 */
export const TRIAL_FAQ = {
	question: "What's included in the free trial?",
	answer:
		"14 days, with no credit card required. The trial starts at 1 property and 5 units. Pick a plan at checkout while more than two days remain and the rest of the trial runs on that plan's limits and features, including lease e-sign on Growth and Max. Checkout takes a card and charges nothing until the trial ends. If you don't pick a plan, you're never charged.",
} as const;
