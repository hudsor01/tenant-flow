// Public-facing social-proof copy. Phase 67 (v2.7) removed the
// unsubstantiated specific-number claims (10,000+ managers, 40% NOI,
// $30,000 savings, 98.7% success rate, 4.9/5 rating) that the
// 2026-04-27 marketing audit flagged as unverifiable. Whatever stays
// here is either factual product copy or a qualitative phrase that
// doesn't make a claim we can't back up.
//
// Numeric claims (managerCount, propertiesManaged, noiIncrease, etc.)
// were removed entirely. Consumers that previously templated them in
// were rewritten to use product-feature copy instead. Don't reintroduce
// numeric claims here without a documented methodology.
export const SOCIAL_PROOF = {
	customerRating: 'Built for landlords',
	roiTimeline: '14-day trial'
} as const
