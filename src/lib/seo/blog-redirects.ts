// Redirect-or-gone map for every deleted blog post.
// Source: tenantflow-seo-audit-bucketed.csv (GSC ghost URLs) cross-referenced
// against the 9 live published slugs. The Phase-6 rebuild hard-deleted ~100
// Phase-1 posts (migration 20260510214942_phase_6_delete_phase_1_broken_drafts);
// with dynamicParams=false on /blog/[slug] those slugs now HTTP-404. These 301s
// transfer the accumulated Google ranking signal (positions 6-13, ~10.9k impr/qtr)
// to the closest live equivalent. Targeting precedence: (1) slug names a /compare
// hub competitor (appfolio|rentredi|buildium) -> that hub; (2) -vs- slug sharing a
// brand token with a live comparison post -> that live /blog post; (3) other -vs-
// -> /compare; (4) generic guide -> /blog.
// See .planning/seo-audit/ANALYSIS-2026-05-29.md.
//
// 2026-11-22 TenantFlow-first cleanup: every published post was held to one rule
// (TenantFlow is the primary subject, shown favourably, with no false product
// claims). 395 posts failed and were hard-deleted, leaving two. Their slugs were
// added here with the same precedence, where "live comparison post" now means a
// kept TenantFlow-first post naming the same competitor, and existing entries
// whose destination was a deleted post were retargeted the same way.
//
// 2026-11-23 Search Console cleanup: Google reported 132 soft 404s, and a redirect
// to a page on a different topic is one of them. An entry now keeps a redirect
// only when its destination covers the same subject: a /compare page or a kept
// comparison post for the same competitor, the security deposit reference card
// for state deposit-law posts, the tax deduction tracker for Schedule E
// deduction posts, the seasonal maintenance checklist for seasonal checklist
// posts. Every other entry has `destination: null` and answers 410 Gone
// (next.config.ts rewrites it to src/app/api/blog-gone/route.ts), which tells
// Google the post was removed on purpose.
//
// 2026-11-23, later: the two comparison posts (Avail vs Stessa vs TenantFlow,
// Buildium vs Rentec Direct) were unpublished, since their claims about
// competitors could not be verified. Their own slugs joined the map (the
// Buildium one to /compare/buildium, the other 410), and the 29 entries that
// pointed at them answer 410: no other page covers Avail, Stessa or Rentec.
//
// REPUBLISH-RECLAIM: next.config.ts filters this map AT BUILD TIME against the
// published slug set (filterActiveRedirects below), so a reclaimed slug 301
// drops automatically on the next deploy after its post publishes — no manual
// entry deletion required. scripts/reclaim-finalize.ts remains as optional
// hygiene to permanently delete stale entries.

export interface BlogRedirect {
	readonly source: string;
	/** The same-topic page to redirect to, or null for 410 Gone. */
	readonly destination: string | null;
}

// Build-time filter: keep a ghost redirect or 410 ONLY while no published post
// exists at its slug. Pure + unit-tested; next.config.ts calls it with the slug
// set fetched from Supabase at build (fail-open to the full map when the fetch
// fails, so a Supabase blip can never break the build or strand a redirect).
export function filterActiveRedirects(
	redirects: readonly BlogRedirect[],
	publishedSlugs: ReadonlySet<string>,
): BlogRedirect[] {
	return redirects.filter(
		(r) => !publishedSlugs.has(r.source.replace("/blog/", "")),
	);
}

export const DELETED_BLOG_REDIRECTS: readonly BlogRedirect[] = [
	{
		source: "/blog/ac-condensate-line-clog-prevention-rentals",
		destination: null,
	},
	{
		source: "/blog/alabama-security-deposit-law-one-month-cap-60-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/alaska-security-deposit-rules-two-month-limit-return-deadlines",
		destination: "/resources/security-deposit-reference-card",
	},
	{ source: "/blog/amortizing-loan-points-rental-mortgage", destination: null },
	{
		source: "/blog/apartments-com-vs-cozy-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/apartments-com-vs-landlord-studio-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/apartments-com-vs-rentredi-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/apartments-com-vs-simplifyem-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/appfolio-alternatives-under-20-month-for-rental-property-management",
		destination: "/compare/appfolio",
	},
	{
		source:
			"/blog/appfolio-alternatives-under-25-month-for-first-time-landlords",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/appfolio-vs-hemlane-complete-comparison-for-2025",
		destination: "/compare/appfolio",
	},
	{
		source:
			"/blog/appfolio-vs-hemlane-complete-comparison-for-2025-with-tenantflow",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/appfolio-vs-rent-manager-2026",
		destination: "/compare/appfolio",
	},
	{
		source:
			"/blog/appfolio-vs-resman-why-independent-landlords-are-choosing-focus-over-feature-bloat",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/arizona-security-deposit-law-cap-and-14-business-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/arkansas-security-deposit-law-two-month-cap-60-day-returns",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/auto-repossessions-on-tenant-credit-reports",
		destination: null,
	},
	{
		source:
			"/blog/automated-rent-collection-complete-setup-guide-for-real-estate-beginners",
		destination: null,
	},
	{
		source:
			"/blog/automating-rent-reminders-a-practical-guide-for-multi-family-investors",
		destination: null,
	},
	{
		source: "/blog/avail-vs-apartments-com-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/avail-vs-doorloop-vs-tenantflow-the-2025-guide-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/avail-vs-hemlane-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/avail-vs-turbotenant-complete-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/avail-vs-zillow-rental-manager-2026", destination: null },
	{
		source: "/blog/bank-statements-to-verify-applicant-income",
		destination: null,
	},
	{
		source: "/blog/best-property-management-software-for-commercial-landlords",
		destination: null,
	},
	{
		source: "/blog/best-property-management-software-for-remote-landlords",
		destination: null,
	},
	{
		source:
			"/blog/blockchain-in-real-estate-explained-a-landlord-s-guide-to-the-future",
		destination: null,
	},
	{
		source: "/blog/bonus-depreciation-residential-rental-landlords",
		destination: null,
	},
	{
		source: "/blog/braided-supply-lines-angle-stops-replacement-rentals",
		destination: null,
	},
	{
		source:
			"/blog/brrrr-method-explained-for-property-investors-a-multi-family-investor-s-guide",
		destination: null,
	},
	{
		source: "/blog/brrrr-method-explained-for-remote-landlords",
		destination: null,
	},
	{
		source:
			"/blog/building-a-property-management-portfolio-a-strategic-guide-for-professional-landlords",
		destination: null,
	},
	{
		source:
			"/blog/buildium-alternatives-under-40-month-for-first-time-landlords",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/buildium-alternatives-under-50-month-a-pragmatic-guide-for-the-independent-landlord",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/buildium-pricing-breakdown-and-hidden-fees-what-independent-landlords-need-to-know",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/buildium-vs-appfolio-2026-small-landlord-comparison",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/buildium-vs-doorloop-vs-tenantflow-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/buildium-vs-innago-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/buildium-vs-landlord-studio-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/buildium-vs-stessa-complete-comparison-for-2026-and-why-tenantflow-is-the-better-choice-for-beginners",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/buildium-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/calculating-debt-to-income-from-credit-report",
		destination: null,
	},
	{
		source:
			"/blog/california-security-deposit-law-ab-12-one-month-cap-21-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/cell-phone-internet-partial-deduction-landlords",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/chapter-7-vs-chapter-13-bankruptcy-tenant-screening",
		destination: null,
	},
	{ source: "/blog/charge-offs-on-tenant-credit-reports", destination: null },
	{
		source:
			"/blog/chatbots-for-tenant-communication-a-smart-solution-for-vacation-rental-owners",
		destination: null,
	},
	{
		source: "/blog/child-support-alimony-as-qualifying-income",
		destination: null,
	},
	{
		source: "/blog/collections-accounts-on-rental-applications-which-matter",
		destination: null,
	},
	{
		source: "/blog/colorado-security-deposit-rules-cap-and-return-window",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/common-mistakes-diy-landlords-make-when-managing-properties",
		destination: null,
	},
	{
		source:
			"/blog/common-mistakes-remote-landlords-make-when-managing-properties",
		destination: null,
	},
	{
		source:
			"/blog/common-mistakes-single-property-landlords-make-when-managing-properties",
		destination: null,
	},
	{
		source: "/blog/communication-tools-for-distant-landlords",
		destination: null,
	},
	{
		source: "/blog/connecticut-security-deposit-law-two-month-cap-interest",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/cost-of-skipping-hvac-filter-changes-rental",
		destination: null,
	},
	{
		source: "/blog/cost-segregation-small-landlords-when-worth-it",
		destination: null,
	},
	{
		source: "/blog/cozy-alternatives-under-20-month-for-vacation-rental-owners",
		destination: null,
	},
	{
		source:
			"/blog/cozy-alternatives-under-30-month-finding-landlord-software-that-doesn-t-compromise-on-control",
		destination: null,
	},
	{
		source: "/blog/cozy-vs-avail-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/cozy-vs-buildium-vs-tenantflow-the-definitive-comparison-for-independent-landlords-in-2026",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/cozy-vs-innago-vs-tenantflow-the-smart-choice-for-first-time-landlords-in-2026",
		destination: null,
	},
	{
		source:
			"/blog/cozy-vs-rent-manager-vs-tenantflow-the-2025-showdown-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/cozy-vs-resman-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/cozy-vs-stessa-complete-comparison-for-2025-and-where-tenantflow-fits",
		destination: null,
	},
	{
		source: "/blog/credit-freezes-and-fraud-alerts-on-applicant-files",
		destination: null,
	},
	{
		source: "/blog/delaware-security-deposit-law-one-month-cap-20-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/depreciating-appliances-carpet-furniture-rentals",
		destination: null,
	},
	{
		source: "/blog/depreciating-capital-improvements-separately",
		destination: null,
	},
	{
		source: "/blog/depreciation-recapture-section-1250-rental-sale",
		destination: null,
	},
	{
		source: "/blog/disputed-accounts-and-consumer-statements-credit-reports",
		destination: null,
	},
	{
		source:
			"/blog/documenting-property-condition-properly-a-landlord-s-guide-to-smart-rental-management",
		destination: null,
	},
	{
		source:
			"/blog/doorloop-alternatives-under-30-month-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/doorloop-alternatives-under-40-month-for-single-property-owners",
		destination: null,
	},
	{
		source:
			"/blog/doorloop-alternatives-under-75-month-a-simple-guide-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/doorloop-review-is-it-worth-the-price-for-professional-landlords",
		destination: null,
	},
	{
		source: "/blog/doorloop-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/doorloop-vs-simplifyem-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/doorloop-vs-stessa-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/employment-verification-call-what-hr-confirms",
		destination: null,
	},
	{ source: "/blog/error-1773361842137", destination: null },
	{ source: "/blog/error-1773377142161", destination: null },
	{ source: "/blog/error-1773381642106", destination: null },
	{ source: "/blog/error-1773387042170", destination: null },
	{ source: "/blog/error-1773404142143", destination: null },
	{ source: "/blog/error-1773415842160", destination: null },
	{ source: "/blog/error-1773435642141", destination: null },
	{ source: "/blog/error-1773455442145", destination: null },
	{ source: "/blog/error-1773480642166", destination: null },
	{ source: "/blog/error-1773509442122", destination: null },
	{ source: "/blog/error-1773542742136", destination: null },
	{ source: "/blog/error-1774345515152", destination: null },
	{ source: "/blog/error-1774355415169", destination: null },
	{ source: "/blog/error-1774389661320", destination: null },
	{ source: "/blog/error-1774403161350", destination: null },
	{ source: "/blog/error-1775084406050", destination: null },
	{ source: "/blog/error-1775358164015", destination: null },
	{ source: "/blog/error-1775646172238", destination: null },
	{ source: "/blog/error-1775703682122", destination: null },
	{ source: "/blog/error-1775833212132", destination: null },
	{ source: "/blog/error-1775948458122", destination: null },
	{
		source:
			"/blog/essential-property-management-tips-for-budget-conscious-landlords",
		destination: null,
	},
	{
		source:
			"/blog/essential-property-management-tips-for-commercial-landlords-a-guide-to-streamlined-operations",
		destination: null,
	},
	{
		source:
			"/blog/essential-property-management-tips-for-single-property-landlords",
		destination: null,
	},
	{
		source: "/blog/essential-property-management-tips-for-small-landlords",
		destination: null,
	},
	{
		source: "/blog/eviction-legal-fees-tax-deductible-landlords",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{ source: "/blog/example-blog-post", destination: null },
	{
		source: "/blog/exterior-paint-siding-maintenance-cycle-rentals",
		destination: null,
	},
	{
		source: "/blog/fall-rental-maintenance-checklist",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{
		source:
			"/blog/filing-claims-after-property-damage-a-strategic-guide-for-multi-family-investors",
		destination: null,
	},
	{ source: "/blog/financial-reports-every-landlord-needs", destination: null },
	{
		source: "/blog/florida-security-deposit-law-return-rules-claim-notice",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/foreclosure-on-rental-applicant-credit-report",
		destination: null,
	},
	{
		source: "/blog/form-4562-landlords-schedule-e",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/free-property-management-software-options-in-2025",
		destination: null,
	},
	{
		source:
			"/blog/free-property-management-software-options-in-2025-a-guide-for-new-landlords",
		destination: null,
	},
	{
		source: "/blog/freeze-prone-climate-rental-winterization-checklist",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{
		source:
			"/blog/from-single-door-to-five-a-practical-playbook-for-scaling-to-50-rental-properties",
		destination: null,
	},
	{
		source:
			"/blog/handling-difficult-tenants-professionally-a-guide-for-self-managing-landlords",
		destination: null,
	},
	{
		source: "/blog/handling-inspection-disputes-with-tenants",
		destination: null,
	},
	{
		source:
			"/blog/handling-inspection-disputes-with-tenants-a-guide-for-first-time-landlords",
		destination: null,
	},
	{
		source: "/blog/hard-inquiries-on-applicant-credit-reports",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-alternatives-under-25-month-best-property-management-software-for-landlords",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-alternatives-under-40-month-a-smart-landlord-s-guide-to-affordable-property-software",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-pricing-breakdown-and-hidden-fees-what-independent-landlords-need-to-know",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-review-is-it-worth-the-price-for-tech-savvy-landlords",
		destination: null,
	},
	{ source: "/blog/hemlane-vs-doorloop-2026-comparison", destination: null },
	{
		source: "/blog/hemlane-vs-innago-complete-comparison-for-2025",
		destination: null,
	},
	{ source: "/blog/hemlane-vs-landlord-studio-2026", destination: null },
	{
		source: "/blog/hemlane-vs-rentredi-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/hemlane-vs-resman-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-vs-simplifyem-vs-tenantflow-the-definitive-2025-comparison-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/hemlane-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/hoa-fees-special-assessments-rental-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/how-remote-landlords-use-tenantflow-to-manage-properties-without-being-on-site",
		destination: null,
	},
	{
		source:
			"/blog/how-to-handle-tenant-complaints-effectively-a-guide-for-the-smart-landlord",
		destination: null,
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-20-a-strategic-guide-for-multi-family-investors",
		destination: null,
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-5-as-a-single-property-owner",
		destination: null,
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-50-without-losing-your-sanity",
		destination: null,
	},
	{
		source: "/blog/how-to-manage-1-rental-property-without-expensive-software",
		destination: null,
	},
	{
		source:
			"/blog/how-to-manage-10-rental-properties-without-expensive-software",
		destination: null,
	},
	{
		source:
			"/blog/how-to-manage-3-rental-properties-without-expensive-property-software",
		destination: null,
	},
	{
		source:
			"/blog/how-to-manage-50-rental-properties-without-expensive-software",
		destination: null,
	},
	{
		source:
			"/blog/how-to-reduce-maintenance-costs-by-5-a-strategic-guide-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/how-to-scale-from-1-to-10-rental-properties",
		destination: null,
	},
	{
		source:
			"/blog/how-to-scale-from-10-to-20-rental-properties-a-commercial-landlord-s-guide",
		destination: null,
	},
	{
		source: "/blog/how-to-scale-from-3-to-6-rental-properties",
		destination: null,
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-100-rental-properties-the-independent-landlord-s-guide",
		destination: null,
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-250-rental-properties-without-losing-your-mind",
		destination: null,
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-500-rental-properties-without-losing-your-mind",
		destination: null,
	},
	{ source: "/blog/how-to-spot-doctored-bank-statements", destination: null },
	{
		source: "/blog/humid-south-rental-mold-moisture-maintenance",
		destination: null,
	},
	{
		source: "/blog/hurricane-season-rental-property-prep-checklist",
		destination: null,
	},
	{
		source: "/blog/illinois-security-deposit-law-return-act-chicago-rlto",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/indiana-security-deposit-law-45-day-return-itemization",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/inherited-rental-stepped-up-basis-depreciation",
		destination: null,
	},
	{
		source:
			"/blog/innago-alternatives-under-40-month-a-practical-guide-for-commercial-landlords",
		destination: null,
	},
	{
		source:
			"/blog/innago-pricing-breakdown-and-hidden-fees-a-honest-look-for-property-investors",
		destination: null,
	},
	{
		source:
			"/blog/innago-review-is-it-worth-the-price-for-commercial-landlords",
		destination: null,
	},
	{
		source: "/blog/innago-vs-apartments-com-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/innago-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/innago-vs-doorloop-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/innago-vs-resman-vs-tenantflow-the-definitive-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/innago-vs-tenantcloud-2026-comparison", destination: null },
	{
		source: "/blog/iowa-security-deposit-law-two-month-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/kansas-security-deposit-law-one-month-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/kentucky-security-deposit-law-urlta-return-deadlines",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/land-improvements-15-year-depreciation-fences-driveways",
		destination: null,
	},
	{
		source: "/blog/landlord-education-books-courses-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/landlord-insurance-explained-for-beginners-protecting-your-rental-income",
		destination: null,
	},
	{
		source: "/blog/landlord-insurance-premium-deduction-schedule-e",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/landlord-studio-review-is-it-worth-the-price-for-first-time-landlords",
		destination: null,
	},
	{
		source:
			"/blog/landlord-studio-vs-innago-vs-tenantflow-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/landlord-studio-vs-resman-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/landlord-studio-vs-resman-complete-comparison-for-2025-and-why-independent-landlords-are-moving-to-tenantflow",
		destination: null,
	},
	{
		source: "/blog/landlord-studio-vs-simplifyem-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/landlord-studio-vs-tenantcloud-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/landlord-travel-deduction-local-out-of-town",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/landlord-utilities-deduction-schedule-e",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/landlord-walkthrough-credit-report-tradelines",
		destination: null,
	},
	{
		source: "/blog/late-payment-patterns-on-credit-reports",
		destination: null,
	},
	{
		source: "/blog/legal-accounting-fees-landlord-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/louisiana-security-deposit-law-30-day-return-deadline",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/maine-security-deposit-law-two-month-cap-return-deadlines",
		destination: "/resources/security-deposit-reference-card",
	},
	{ source: "/blog/managing-contractors-from-a-distance", destination: null },
	{
		source: "/blog/maryland-security-deposit-law-45-day-return-interest",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/massachusetts-security-deposit-law-one-month-cap-strict-rules",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/mastering-the-brrrr-method-a-strategic-guide-for-single-property-landlords",
		destination: null,
	},
	{ source: "/blog/medical-debt-on-tenant-credit-reports", destination: null },
	{
		source: "/blog/michigan-security-deposit-law-cap-checklist-itemization",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/mid-month-convention-rental-depreciation-proration",
		destination: null,
	},
	{
		source: "/blog/minnesota-security-deposit-law-21-day-return-interest",
		destination: "/resources/security-deposit-reference-card",
	},
	{ source: "/blog/missed-depreciation-form-3115-fix", destination: null },
	{
		source: "/blog/missouri-security-deposit-law-two-month-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/montana-security-deposit-law-return-deadlines-deductions",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/mortgage-interest-deduction-rental-property-schedule-e",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/nebraska-security-deposit-law-one-month-cap-14-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/nevada-security-deposit-law-three-month-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/new-hampshire-security-deposit-law-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source: "/blog/new-jersey-security-deposit-law-cap-interest-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/new-mexico-security-deposit-law-limits-interest-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/new-york-security-deposit-law-hstpa-one-month-cap-14-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/north-carolina-security-deposit-law-tiered-caps-return-rules",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/north-dakota-security-deposit-law-one-month-cap-30-day-return",
		destination: "/resources/security-deposit-reference-card",
	},
	{ source: "/blog/offer-letters-as-income-proof", destination: null },
	{
		source: "/blog/ohio-security-deposit-law-30-day-return-interest-damages",
		destination: "/resources/security-deposit-reference-card",
	},
	{ source: "/blog/photography-tips-for-rental-listings", destination: null },
	{
		source: "/blog/pmi-deduction-rental-property-mortgage-insurance",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/property-management-fees-leasing-commissions-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/property-management-for-out-of-state-landlords",
		destination: null,
	},
	{
		source: "/blog/property-management-software-subscription-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/propertyware-alternatives-under-100-month-a-simple-guide-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/propertyware-alternatives-under-30-month-a-practical-guide-for-diy-landlords",
		destination: null,
	},
	{
		source: "/blog/propertyware-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/propertyware-vs-buildium-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/propertyware-vs-cozy-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/propertyware-vs-hemlane-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/propertyware-vs-innago-vs-tenantflow-the-definitive-guide-for-small-landlords-in-2025",
		destination: null,
	},
	{
		source: "/blog/propertyware-vs-resman-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/propertyware-vs-simplifyem-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/propertyware-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/qualifying-applicants-with-seasonal-variable-income",
		destination: null,
	},
	{
		source: "/blog/reading-credit-utilization-on-tenant-credit-reports",
		destination: null,
	},
	{
		source: "/blog/refrigerator-coil-cleaning-rental-appliance-life",
		destination: null,
	},
	{
		source: "/blog/rent-manager-alternatives-under-100-month",
		destination: null,
	},
	{
		source:
			"/blog/rent-manager-alternatives-under-100-month-a-strategic-guide-for-professional-landlords",
		destination: null,
	},
	{
		source:
			"/blog/rent-manager-pricing-breakdown-and-hidden-fees-what-independent-landlords-need-to-know",
		destination: null,
	},
	{
		source:
			"/blog/rent-manager-pricing-breakdown-and-hidden-fees-what-you-need-to-know-before-you-subscribe",
		destination: null,
	},
	{
		source:
			"/blog/rent-manager-review-is-it-worth-the-price-for-the-independent-landlord",
		destination: null,
	},
	{
		source:
			"/blog/rent-manager-vs-landlord-studio-complete-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/rent-manager-vs-propertyware-2026", destination: null },
	{
		source: "/blog/rent-manager-vs-rentredi-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rent-manager-vs-resman-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/rent-manager-vs-stessa-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/rental-caulk-grout-maintenance-schedule",
		destination: null,
	},
	{
		source: "/blog/rental-chimney-fireplace-maintenance-schedule",
		destination: null,
	},
	{
		source: "/blog/rental-closing-costs-deductible-amortized-basis",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{ source: "/blog/rental-deck-safety-inspection-guide", destination: null },
	{
		source: "/blog/rental-depreciation-27-5-year-straight-line",
		destination: null,
	},
	{
		source: "/blog/rental-driveway-walkway-maintenance-liability",
		destination: null,
	},
	{ source: "/blog/rental-dryer-vent-cleaning-fire-risk", destination: null },
	{
		source: "/blog/rental-garbage-disposal-maintenance-tenant-education",
		destination: null,
	},
	{
		source: "/blog/rental-gutter-maintenance-ice-dams-foundation",
		destination: null,
	},
	{
		source: "/blog/rental-irrigation-system-maintenance-guide",
		destination: null,
	},
	{
		source: "/blog/rental-property-tax-deduction-schedule-e-salt-cap",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{ source: "/blog/rental-roof-inspection-what-to-check", destination: null },
	{
		source: "/blog/rental-sewer-line-maintenance-camera-inspection",
		destination: null,
	},
	{
		source: "/blog/rental-smoke-co-detector-maintenance-schedule",
		destination: null,
	},
	{
		source: "/blog/rental-sump-pump-maintenance-testing-backup",
		destination: null,
	},
	{
		source: "/blog/rental-tree-trimming-schedule-roof-sewer-storm",
		destination: null,
	},
	{
		source: "/blog/rental-window-maintenance-seals-screens",
		destination: null,
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-20-month-a-practical-guide-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-40-month-a-streamlined-approach-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-75-month-for-tech-savvy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/rentec-direct-vs-apartments-com-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/rentec-direct-vs-avail-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/rentec-direct-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{ source: "/blog/rentec-direct-vs-yardi-breeze-2026", destination: null },
	{
		source:
			"/blog/rentredi-alternatives-under-100-month-a-simple-guide-for-new-landlords",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-alternatives-under-30-month-for-budget-conscious-landlords",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-alternatives-under-50-month-a-practical-guide-for-the-independent-landlord",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-alternatives-under-75-month-a-strategic-comparison-for-single-property-landlords",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-pricing-breakdown-and-hidden-fees-what-every-small-landlord-needs-to-know",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-pricing-breakdown-and-hidden-fees-what-small-landlords-need-to-know",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rentredi-vs-cozy-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rentredi-vs-doorloop-2026",
		destination: "/compare/rentredi",
	},
	{ source: "/blog/rentredi-vs-innago-2026", destination: "/compare/rentredi" },
	{
		source: "/blog/rentredi-vs-innago-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rentredi-vs-rentec-direct-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rentredi-vs-resman-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rentredi-vs-turbotenant-2026-comparison",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/repairs-deduction-schedule-e-line-14",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/resman-alternatives-under-20-month-a-smarter-path-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/resman-alternatives-under-25-month-for-vacation-rental-owners",
		destination: null,
	},
	{
		source:
			"/blog/resman-review-is-it-worth-the-price-for-first-time-landlords",
		destination: null,
	},
	{
		source: "/blog/resman-vs-rent-manager-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/resman-vs-simplifyem-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/resman-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/roof-lifespan-by-material-rentals", destination: null },
	{
		source: "/blog/routine-upkeep-landscaping-pest-control-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source:
			"/blog/scaling-from-10-to-100-rental-properties-a-landlord-s-growth-blueprint",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-10-to-20-rental-properties-a-practical-guide-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-10-to-20-rental-properties-a-self-managing-landlord-s-guide",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-10-to-30-rental-properties-the-operational-challenge-for-independent-investors",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-20-to-100-rental-properties-a-practical-guide-for-diy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-20-to-200-rental-properties-a-practical-guide-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-20-to-40-rental-properties-the-operational-shift-every-landlord-must-master",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-3-to-30-rental-properties-a-vacation-rental-owner-s-guide",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-3-to-30-rental-properties-the-operational-shift-every-landlord-must-make",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-3-to-9-rental-properties-a-practical-guide-for-the-budget-conscious-landlord",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-5-to-15-rental-properties-a-practical-guide-for-busy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-5-to-15-rental-properties-landlord-tips-for-growth-without-burning-out",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-5-to-25-rental-properties-the-independent-landlord-s-playbook",
		destination: null,
	},
	{
		source:
			"/blog/scaling-from-50-to-250-rental-properties-the-operational-blueprint-for-remote-landlords",
		destination: null,
	},
	{
		source: "/blog/schedule-e-line-19-other-expenses-examples",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/screening-applicants-with-thin-credit-files",
		destination: null,
	},
	{ source: "/blog/screening-gig-workers-variable-income", destination: null },
	{
		source: "/blog/screening-housing-voucher-applicants-legally",
		destination: null,
	},
	{
		source: "/blog/section-179-vs-bonus-depreciation-rentals",
		destination: null,
	},
	{
		source: "/blog/security-deposit-deadlines-and-caps-all-50-states",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/security-deposit-laws-by-state-your-rent-collection-property-management-guide-for-diy-landlords",
		destination: "/resources/security-deposit-reference-card",
	},
	{
		source:
			"/blog/security-deposit-management-best-practices-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/security-systems-for-remote-monitoring-essential-tips-for-self-managing-landlords",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-alternatives-under-100-month-a-guide-for-new-landlords",
		destination: null,
	},
	{
		source: "/blog/simplifyem-alternatives-under-40-month-for-diy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-alternatives-under-75-month-a-landlord-s-guide-to-streamlined-property-management",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-pricing-breakdown-and-hidden-fees-what-every-property-investor-needs-to-know",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-pricing-breakdown-and-hidden-fees-why-independent-landlords-choose-tenantflow",
		destination: null,
	},
	{
		source: "/blog/simplifyem-vs-avail-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/simplifyem-vs-avail-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/simplifyem-vs-hemlane-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-vs-innago-a-2026-comparison-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-vs-propertyware-a-detailed-comparison-for-2026-with-tenantflow",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-vs-propertyware-vs-tenantflow-the-best-software-for-budget-conscious-landlords-in-2025",
		destination: null,
	},
	{
		source: "/blog/simplifyem-vs-rent-manager-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/simplifyem-vs-rentec-direct-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-vs-turbotenant-vs-tenantflow-the-definitive-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/simplifyem-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/smart-home-technology-for-rentals-a-guide-for-remote-landlords",
		destination: null,
	},
	{
		source: "/blog/soft-pull-vs-hard-pull-tenant-screening",
		destination: null,
	},
	{
		source: "/blog/spotting-fake-paystubs-rental-applications",
		destination: null,
	},
	{
		source: "/blog/spring-rental-maintenance-checklist",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{
		source: "/blog/standardized-income-verification-document-packet",
		destination: null,
	},
	{
		source:
			"/blog/stessa-alternatives-under-40-month-a-better-fit-for-independent-commercial-landlords",
		destination: null,
	},
	{
		source:
			"/blog/stessa-alternatives-under-50-month-a-comparison-for-tech-savvy-landlords",
		destination: null,
	},
	{
		source: "/blog/stessa-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{ source: "/blog/stessa-vs-avail-2026", destination: null },
	{
		source: "/blog/stessa-vs-buildium-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/stessa-vs-innago-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/stessa-vs-landlord-studio-2026-comparison",
		destination: null,
	},
	{
		source: "/blog/stessa-vs-rent-manager-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/stessa-vs-rentredi-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/stessa-vs-simplifyem-complete-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/stessa-vs-turbotenant-2026", destination: null },
	{
		source: "/blog/stessa-vs-turbotenant-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/stessa-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/streamlining-the-move-in-and-move-out-process-a-guide-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/summer-rental-maintenance-checklist",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{
		source: "/blog/supplies-small-tools-landlord-deduction",
		destination: "/resources/landlord-tax-deduction-tracker",
	},
	{
		source: "/blog/tenant-screening-checklist-for-multi-family-investors",
		destination: null,
	},
	{
		source: "/blog/tenant-screening-tips-for-new-landlords",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-alternatives-under-40-month",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-vs-apartments-com-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-vs-landlord-studio-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-vs-stessa-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-vs-stessa-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/tenantcloud-vs-yardi-breeze-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-coverage-gaps-landlords-often-miss-and-how-to-fix-them-with-smart-property-management",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-pricing-vs-competitors-a-landlord-s-guide-for-beginners",
		destination: null,
	},
	{
		source: "/blog/tenantflow-success-stories-from-remote-landlords",
		destination: null,
	},
	{
		source: "/blog/tenantflow-success-stories-from-self-managing-landlords",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-success-stories-how-independent-landlords-scale-without-the-overhead",
		destination: null,
	},
	{ source: "/blog/tenantflow-vs-cozy-complete-comparison", destination: null },
	{
		source:
			"/blog/tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-vs-hemlane-complete-comparison-for-commercial-landlords",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-vs-hemlane-complete-comparison-for-commercial-landlords-in-2025",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-vs-landlord-studio-a-practical-comparison-for-the-remote-landlord",
		destination: null,
	},
	{
		source:
			"/blog/tenantflow-vs-resman-a-clear-comparison-for-budget-conscious-landlords",
		destination: null,
	},
	{
		source: "/blog/the-3x-rent-to-income-rule-and-alternatives",
		destination: null,
	},
	{
		source:
			"/blog/the-best-property-management-software-under-100-a-month-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/the-brrrr-method-explained-for-professional-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-brrrr-method-explained-for-property-investors-a-landlord-s-guide-to-scaling-with-tenantflow",
		destination: null,
	},
	{
		source:
			"/blog/the-definitive-guide-to-seasonal-property-inspections-for-professional-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-definitive-tenant-screening-checklist-for-vacation-rental-owners",
		destination: null,
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-budget-conscious-landlords",
		destination: null,
	},
	{
		source: "/blog/the-essential-tenant-screening-checklist-for-busy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-first-time-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-remote-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-remote-landlords-a-guide-for-beginners",
		destination: null,
	},
	{
		source:
			"/blog/the-first-time-landlord-s-guide-to-property-management-software-streamlining-your-rental-business",
		destination: null,
	},
	{
		source:
			"/blog/the-hidden-costs-of-free-rent-administration-why-independent-landlords-need-a-better-alternative-to-avail",
		destination: null,
	},
	{
		source:
			"/blog/the-independent-landlord-s-guide-to-regular-property-inspection-schedules",
		destination: null,
	},
	{
		source:
			"/blog/the-independent-landlord-s-guide-to-the-top-20-property-management-apps-and-why-simplification-wins",
		destination: null,
	},
	{
		source:
			"/blog/the-mobile-reality-why-a-true-landlord-software-platform-must-extend-beyond-the-desktop",
		destination: null,
	},
	{
		source:
			"/blog/the-property-management-app-dilemma-a-simple-guide-for-the-tech-savvy-small-landlord",
		destination: null,
	},
	{
		source:
			"/blog/the-real-cost-of-free-property-management-a-budget-conscious-landlord-s-guide-to-50-apps",
		destination: null,
	},
	{
		source:
			"/blog/the-realistic-guide-to-property-management-software-for-independent-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-realistic-guide-to-property-management-software-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/the-reality-of-top-100-lists-a-curated-guide-for-the-serious-landlord",
		destination: null,
	},
	{
		source:
			"/blog/the-right-tools-for-the-independent-landlord-cutting-through-the-noise-of-top-100-lists",
		destination: null,
	},
	{
		source:
			"/blog/the-smart-landlord-s-guide-to-choosing-the-right-property-management-software",
		destination: null,
	},
	{
		source:
			"/blog/the-smart-landlord-s-guide-to-property-management-software-for-tech-savvy-owners",
		destination: null,
	},
	{
		source:
			"/blog/the-strategic-blueprint-scaling-your-rental-portfolio-from-3-to-6-properties",
		destination: null,
	},
	{
		source:
			"/blog/the-top-property-management-apps-for-tech-savvy-landlords-a-streamlined-comparison",
		destination: null,
	},
	{
		source:
			"/blog/the-ultimate-tenant-screening-checklist-for-professional-landlords",
		destination: null,
	},
	{
		source: "/blog/top-1-property-management-app-for-first-time-landlords",
		destination: null,
	},
	{
		source: "/blog/top-1-property-management-app-for-single-property-owners",
		destination: null,
	},
	{
		source:
			"/blog/top-10-property-management-apps-for-multi-family-investors-budget-friendly-options",
		destination: null,
	},
	{
		source: "/blog/top-10-property-management-apps-for-single-property-owners",
		destination: null,
	},
	{
		source: "/blog/top-10-property-management-apps-for-vacation-rental-owners",
		destination: null,
	},
	{
		source: "/blog/top-100-property-management-apps-for-first-time-landlords",
		destination: null,
	},
	{
		source: "/blog/top-100-property-management-apps-for-real-estate-beginners",
		destination: null,
	},
	{
		source:
			"/blog/top-100-property-management-apps-for-self-managing-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-100-property-management-apps-for-self-managing-landlords-a-focused-guide-for-the-independent-owner",
		destination: null,
	},
	{
		source: "/blog/top-20-property-management-apps-for-diy-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-professional-landlords-a-focused-review-for-the-independent-investor",
		destination: null,
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-single-property-landlords-a-streamlined-guide-for-the-independent-landlord",
		destination: null,
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-vacation-rental-owners-a-guide-for-professional-landlords",
		destination: null,
	},
	{
		source: "/blog/top-3-property-management-apps-for-commercial-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-3-property-management-apps-for-multi-family-investors-a-diy-landlord-s-guide",
		destination: null,
	},
	{
		source: "/blog/top-3-property-management-apps-for-professional-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-3-property-management-apps-for-professional-self-managing-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-budget-conscious-landlords",
		destination: null,
	},
	{
		source: "/blog/top-5-property-management-apps-for-busy-landlords",
		destination: null,
	},
	{
		source: "/blog/top-5-property-management-apps-for-diy-landlords",
		destination: null,
	},
	{
		source: "/blog/top-5-property-management-apps-for-first-time-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-first-time-landlords-remote-friendly",
		destination: null,
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-real-estate-beginners-a-landlord-centric-comparison",
		destination: null,
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-single-property-landlords",
		destination: null,
	},
	{
		source: "/blog/top-5-property-management-apps-for-small-landlords",
		destination: null,
	},
	{
		source: "/blog/top-5-property-management-apps-for-tech-savvy-landlords",
		destination: null,
	},
	{
		source: "/blog/top-50-property-management-apps-for-small-landlords",
		destination: null,
	},
	{
		source:
			"/blog/top-50-property-management-apps-for-small-landlords-budget-friendly-easy-to-use",
		destination: null,
	},
	{
		source: "/blog/top-50-property-management-apps-for-vacation-rental-owners",
		destination: null,
	},
	{
		source:
			"/blog/turbotenant-alternatives-under-25-month-best-rental-management-software-for-vacation-rental-owners",
		destination: null,
	},
	{
		source:
			"/blog/turbotenant-alternatives-under-25-month-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/turbotenant-vs-apartments-com-complete-comparison-for-2025",
		destination: null,
	},
	{
		source: "/blog/turbotenant-vs-apartments-com-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/turbotenant-vs-appfolio-complete-comparison-for-2025",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/turbotenant-vs-innago-complete-comparison-for-2025",
		destination: null,
	},
	{
		source:
			"/blog/turbotenant-vs-propertyware-vs-tenantflow-the-definitive-2026-guide-for-independent-landlords",
		destination: null,
	},
	{
		source: "/blog/turbotenant-vs-tenantcloud-complete-comparison-for-2026",
		destination: null,
	},
	{
		source: "/blog/turbotenant-vs-zillow-rental-manager-2026",
		destination: null,
	},
	{
		source: "/blog/twelve-month-preventive-maintenance-calendar-rentals",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{ source: "/blog/using-zapier-for-property-management", destination: null },
	{
		source: "/blog/vantagescore-vs-fico-vs-residentscore-screening-reports",
		destination: null,
	},
	{
		source: "/blog/vendor-management-for-property-owners-a-beginner-s-guide",
		destination: null,
	},
	{ source: "/blog/verifying-commission-based-income", destination: null },
	{
		source: "/blog/verifying-retirement-income-rental-applicants",
		destination: null,
	},
	{
		source: "/blog/verifying-self-employed-applicant-income",
		destination: null,
	},
	{
		source: "/blog/virtual-tours-that-attract-quality-tenants",
		destination: null,
	},
	{
		source: "/blog/washing-machine-hose-replacement-schedule-rentals",
		destination: null,
	},
	{
		source:
			"/blog/what-to-look-for-during-inspections-a-practical-guide-for-single-property-owners",
		destination: null,
	},
	{
		source: "/blog/why-credit-score-alone-misleads-landlords",
		destination: null,
	},
	{
		source:
			"/blog/why-professional-landlords-are-moving-from-complex-suites-to-focused-workflows",
		destination: null,
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-diy-landlords",
		destination: null,
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-small-landlords",
		destination: null,
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-tech-savvy-landlords",
		destination: null,
	},
	{
		source: "/blog/wildfire-zone-rental-defensible-space-maintenance",
		destination: null,
	},
	{
		source: "/blog/winter-rental-maintenance-checklist",
		destination: "/resources/seasonal-maintenance-checklist",
	},
	{
		source:
			"/blog/yardi-breeze-alternatives-under-100-month-for-multi-family-investors",
		destination: null,
	},
	{
		source:
			"/blog/yardi-breeze-alternatives-under-50-month-a-pragmatic-guide-for-new-landlords",
		destination: null,
	},
	{
		source: "/blog/yardi-breeze-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{
		source:
			"/blog/yardi-breeze-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/zillow-rental-manager-alternatives-under-30-month-a-guide-for-the-independent-landlord",
		destination: null,
	},
	{
		source: "/blog/zillow-rental-manager-alternatives-under-50-month",
		destination: null,
	},
	{
		source: "/blog/zillow-rental-manager-alternatives-under-75-month",
		destination: null,
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-buildium-vs-tenantflow-the-definitive-2025-guide-for-independent-landlords",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-doorloop-complete-comparison-for-2026",
		destination: null,
	},
	{ source: "/blog/zillow-rental-manager-vs-innago-2026", destination: null },
	{
		source:
			"/blog/zillow-rental-manager-vs-innago-complete-comparison-for-2026",
		destination: null,
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-rent-manager-vs-tenantflow-the-2026-guide-for-budget-conscious-landlords",
		destination: null,
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-rentredi-complete-comparison-for-2025-and-why-tenantflow-wins-for-independent-landlords",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-rentredi-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-tenantcloud-complete-comparison-for-2026",
		destination: null,
	},
];
