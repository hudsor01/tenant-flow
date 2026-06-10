// Evergreen topic source for the v5.0 blog factory (BLOG-09c).
// The n8n Schedule Trigger draws topics in priority order: the Phase-13
// `RECLAIM_QUEUE` (src/lib/seo/reclaim-queue.ts) FIRST — highest SEO value, it
// reclaims deleted high-impression ghost slugs — then this evergreen list once
// the reclaim queue is worked through. Unlike reclaim, evergreen entries let the
// model choose the slug (no fixed `slug` field), so they need no redirect mapping.
//
// The Phase-14 pre-POST dedup check (`blogSlugExists` in
// scripts/generate-blog-draft.ts) makes re-picking an already-generated slug a
// clean no-op skip (exit 0, no wasted local-LLM generation), so the schedule can
// cycle this list safely.
//
// `category` is the closest of the five valid generator categories
// (lease-law | tax-prep | tenant-screening | maintenance | software-vault); the
// owner passes it to the generator at run time. Topics are genuinely useful
// independent-landlord subjects — never rent-facilitation / tenant-portal framing.

export interface EvergreenTopic {
	readonly topic: string;
	readonly category: string;
}

export const EVERGREEN_TOPICS: readonly EvergreenTopic[] = [
	{
		topic:
			"A state-by-state lease clause checklist every first-time landlord should review",
		category: "lease-law",
	},
	{
		topic:
			"How to write an enforceable late-fee and notice-to-quit clause that holds up",
		category: "lease-law",
	},
	{
		topic: "A Schedule E deduction walkthrough for small landlords at tax time",
		category: "tax-prep",
	},
	{
		topic:
			"Repairs vs capital improvements: classifying rental expenses correctly for taxes",
		category: "tax-prep",
	},
	{
		topic:
			"How to read a credit report on a rental application without missing red flags",
		category: "tenant-screening",
	},
	{
		topic:
			"Building a fair, consistent applicant-screening checklist that avoids fair-housing risk",
		category: "tenant-screening",
	},
	{
		topic:
			"A seasonal preventive-maintenance calendar for small rental portfolios",
		category: "maintenance",
	},
	{
		topic:
			"Handling emergency maintenance requests without losing your weekend",
		category: "maintenance",
	},
	{
		topic:
			"Organizing lease, insurance, and inspection documents so nothing slips through the cracks",
		category: "software-vault",
	},
	{
		topic:
			"What records every landlord should keep, and exactly how long to keep them",
		category: "software-vault",
	},
];
