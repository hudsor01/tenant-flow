// Seeded reclaim worklist for the v4.0 SEO-01 carryover (BLOG-08b).
// Source: the Republish-reclaim table in .planning/seo-audit/ANALYSIS-2026-05-29.md
// (top-10 deleted ghost slugs by GSC impressions/quarter). Each entry feeds the
// blog generator's `--slug <ghost-slug>` override so a quality replacement post is
// produced at the EXACT URL Google already ranked, instead of accepting the 301 to
// a hub.
//
// INVARIANT (drift-guarded by src/lib/seo/__tests__/reclaim-queue.test.ts):
// every `slug` here MUST remain a current DELETED_BLOG_REDIRECTS source (minus the
// "/blog/" prefix) until `scripts/reclaim-finalize.ts <slug>` removes that redirect
// on publish. A queue entry whose slug stopped being a redirect source would point
// the owner at a non-reclaimable (no-longer-301'd) URL — the test fails loud first.
//
// `category` is a BEST-EFFORT default — the closest of the five valid generator
// categories (lease-law | tax-prep | tenant-screening | maintenance | software-vault).
// Most top-10 ghosts are competitor/pricing/listicle topics (software-vault); a few
// (e.g. listing photography) have no clean fit. The owner passes the final category to
// the generator at run time, so this is guidance, not a binding contract.

export interface ReclaimQueueItem {
	readonly slug: string;
	readonly topic: string;
	readonly category: string;
}

export const RECLAIM_QUEUE: readonly ReclaimQueueItem[] = [
	{
		slug: "rentredi-pricing-breakdown-and-hidden-fees-what-every-small-landlord-needs-to-know",
		topic:
			"RentRedi pricing breakdown and hidden fees: what every small landlord needs to know",
		category: "software-vault",
	},
	{
		slug: "yardi-breeze-vs-appfolio-complete-comparison-for-2026",
		topic: "Yardi Breeze vs AppFolio: a complete comparison for 2026",
		category: "software-vault",
	},
	{
		slug: "stessa-vs-rentredi-complete-comparison-for-2026",
		topic: "Stessa vs RentRedi: a complete comparison for 2026",
		category: "software-vault",
	},
	{
		slug: "photography-tips-for-rental-listings",
		topic: "Photography tips for rental listings",
		category: "software-vault",
	},
	{
		slug: "top-50-property-management-apps-for-small-landlords",
		topic: "Top 50 property management apps for small landlords",
		category: "software-vault",
	},
	{
		slug: "rentec-direct-vs-avail-complete-comparison-for-2025",
		topic: "Rentec Direct vs Avail: a complete comparison for 2025",
		category: "software-vault",
	},
	{
		slug: "top-3-property-management-apps-for-commercial-landlords",
		topic: "Top 3 property management apps for commercial landlords",
		category: "software-vault",
	},
	{
		slug: "top-5-property-management-apps-for-first-time-landlords-remote-friendly",
		topic:
			"Top 5 property management apps for first-time landlords: remote-friendly picks",
		category: "software-vault",
	},
	{
		slug: "stessa-vs-turbotenant-complete-comparison-for-2026",
		topic: "Stessa vs TurboTenant: a complete comparison for 2026",
		category: "software-vault",
	},
	{
		slug: "rent-manager-pricing-breakdown-and-hidden-fees-what-you-need-to-know-before-you-subscribe",
		topic:
			"Rent Manager pricing breakdown and hidden fees: what you need to know before you subscribe",
		category: "software-vault",
	},
];
