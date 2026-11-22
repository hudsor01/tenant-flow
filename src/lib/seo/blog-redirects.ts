// Auto-generated 301 redirect map for the deleted Phase-1 blog catalogue.
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
// REPUBLISH-RECLAIM: next.config.ts filters this map AT BUILD TIME against the
// published slug set (filterActiveRedirects below), so a reclaimed slug 301
// drops automatically on the next deploy after its post publishes — no manual
// entry deletion required. scripts/reclaim-finalize.ts remains as optional
// hygiene to permanently delete stale entries.

export interface BlogRedirect {
	readonly source: string;
	readonly destination: string;
}

// Build-time filter: keep a ghost 301 ONLY while no published post exists at its
// slug. Pure + unit-tested; next.config.ts calls it with the slug set fetched
// from Supabase at build (fail-open to the full map when the fetch fails, so a
// Supabase blip can never break the build or strand a redirect).
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
		destination: "/blog",
	},
	{
		source: "/blog/alabama-security-deposit-law-one-month-cap-60-day-return",
		destination: "/blog",
	},
	{
		source:
			"/blog/alaska-security-deposit-rules-two-month-limit-return-deadlines",
		destination: "/blog",
	},
	{
		source: "/blog/amortizing-loan-points-rental-mortgage",
		destination: "/blog",
	},
	{
		source: "/blog/apartments-com-vs-cozy-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/apartments-com-vs-landlord-studio-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/apartments-com-vs-rentredi-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/apartments-com-vs-simplifyem-complete-comparison-for-2026",
		destination: "/compare",
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
		destination: "/blog",
	},
	{
		source: "/blog/arkansas-security-deposit-law-two-month-cap-60-day-returns",
		destination: "/blog",
	},
	{
		source: "/blog/auto-repossessions-on-tenant-credit-reports",
		destination: "/blog",
	},
	{
		source:
			"/blog/automated-rent-collection-complete-setup-guide-for-real-estate-beginners",
		destination: "/blog",
	},
	{
		source:
			"/blog/automating-rent-reminders-a-practical-guide-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source: "/blog/avail-vs-apartments-com-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source:
			"/blog/avail-vs-doorloop-vs-tenantflow-the-2025-guide-for-independent-landlords",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/avail-vs-hemlane-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/avail-vs-turbotenant-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/avail-vs-zillow-rental-manager-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/bank-statements-to-verify-applicant-income",
		destination: "/blog",
	},
	{
		source: "/blog/best-property-management-software-for-commercial-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/best-property-management-software-for-remote-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/blockchain-in-real-estate-explained-a-landlord-s-guide-to-the-future",
		destination: "/blog",
	},
	{
		source: "/blog/bonus-depreciation-residential-rental-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/braided-supply-lines-angle-stops-replacement-rentals",
		destination: "/blog",
	},
	{
		source:
			"/blog/brrrr-method-explained-for-property-investors-a-multi-family-investor-s-guide",
		destination: "/blog",
	},
	{
		source: "/blog/brrrr-method-explained-for-remote-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/building-a-property-management-portfolio-a-strategic-guide-for-professional-landlords",
		destination: "/blog",
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
		destination: "/blog",
	},
	{
		source:
			"/blog/california-security-deposit-law-ab-12-one-month-cap-21-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/cell-phone-internet-partial-deduction-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/chapter-7-vs-chapter-13-bankruptcy-tenant-screening",
		destination: "/compare",
	},
	{
		source: "/blog/charge-offs-on-tenant-credit-reports",
		destination: "/blog",
	},
	{
		source:
			"/blog/chatbots-for-tenant-communication-a-smart-solution-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source: "/blog/child-support-alimony-as-qualifying-income",
		destination: "/blog",
	},
	{
		source: "/blog/collections-accounts-on-rental-applications-which-matter",
		destination: "/blog",
	},
	{
		source: "/blog/colorado-security-deposit-rules-cap-and-return-window",
		destination: "/blog",
	},
	{
		source: "/blog/common-mistakes-diy-landlords-make-when-managing-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/common-mistakes-remote-landlords-make-when-managing-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/common-mistakes-single-property-landlords-make-when-managing-properties",
		destination: "/blog",
	},
	{
		source: "/blog/communication-tools-for-distant-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/connecticut-security-deposit-law-two-month-cap-interest",
		destination: "/blog",
	},
	{
		source: "/blog/cost-of-skipping-hvac-filter-changes-rental",
		destination: "/blog",
	},
	{
		source: "/blog/cost-segregation-small-landlords-when-worth-it",
		destination: "/blog",
	},
	{
		source: "/blog/cozy-alternatives-under-20-month-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/cozy-alternatives-under-30-month-finding-landlord-software-that-doesn-t-compromise-on-control",
		destination: "/compare",
	},
	{
		source: "/blog/cozy-vs-avail-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source:
			"/blog/cozy-vs-buildium-vs-tenantflow-the-definitive-comparison-for-independent-landlords-in-2026",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/cozy-vs-innago-vs-tenantflow-the-smart-choice-for-first-time-landlords-in-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/cozy-vs-rent-manager-vs-tenantflow-the-2025-showdown-for-independent-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/cozy-vs-resman-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/cozy-vs-stessa-complete-comparison-for-2025-and-where-tenantflow-fits",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/credit-freezes-and-fraud-alerts-on-applicant-files",
		destination: "/blog",
	},
	{
		source: "/blog/delaware-security-deposit-law-one-month-cap-20-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/depreciating-appliances-carpet-furniture-rentals",
		destination: "/blog",
	},
	{
		source: "/blog/depreciating-capital-improvements-separately",
		destination: "/blog",
	},
	{
		source: "/blog/depreciation-recapture-section-1250-rental-sale",
		destination: "/blog",
	},
	{
		source: "/blog/disputed-accounts-and-consumer-statements-credit-reports",
		destination: "/blog",
	},
	{
		source:
			"/blog/documenting-property-condition-properly-a-landlord-s-guide-to-smart-rental-management",
		destination: "/blog",
	},
	{
		source:
			"/blog/doorloop-alternatives-under-30-month-for-independent-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/doorloop-alternatives-under-40-month-for-single-property-owners",
		destination: "/compare",
	},
	{
		source:
			"/blog/doorloop-alternatives-under-75-month-a-simple-guide-for-small-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/doorloop-review-is-it-worth-the-price-for-professional-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/doorloop-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/doorloop-vs-simplifyem-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/doorloop-vs-stessa-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/employment-verification-call-what-hr-confirms",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773361842137",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773377142161",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773381642106",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773387042170",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773404142143",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773415842160",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773435642141",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773455442145",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773480642166",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773509442122",
		destination: "/blog",
	},
	{
		source: "/blog/error-1773542742136",
		destination: "/blog",
	},
	{
		source: "/blog/error-1774345515152",
		destination: "/blog",
	},
	{
		source: "/blog/error-1774355415169",
		destination: "/blog",
	},
	{
		source: "/blog/error-1774389661320",
		destination: "/blog",
	},
	{
		source: "/blog/error-1774403161350",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775084406050",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775358164015",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775646172238",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775703682122",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775833212132",
		destination: "/blog",
	},
	{
		source: "/blog/error-1775948458122",
		destination: "/blog",
	},
	{
		source:
			"/blog/essential-property-management-tips-for-budget-conscious-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/essential-property-management-tips-for-commercial-landlords-a-guide-to-streamlined-operations",
		destination: "/blog",
	},
	{
		source:
			"/blog/essential-property-management-tips-for-single-property-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/essential-property-management-tips-for-small-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/eviction-legal-fees-tax-deductible-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/example-blog-post",
		destination: "/blog",
	},
	{
		source: "/blog/exterior-paint-siding-maintenance-cycle-rentals",
		destination: "/blog",
	},
	{
		source: "/blog/fall-rental-maintenance-checklist",
		destination: "/blog",
	},
	{
		source:
			"/blog/filing-claims-after-property-damage-a-strategic-guide-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source: "/blog/financial-reports-every-landlord-needs",
		destination: "/blog",
	},
	{
		source: "/blog/florida-security-deposit-law-return-rules-claim-notice",
		destination: "/blog",
	},
	{
		source: "/blog/foreclosure-on-rental-applicant-credit-report",
		destination: "/blog",
	},
	{
		source: "/blog/form-4562-landlords-schedule-e",
		destination: "/blog",
	},
	{
		source: "/blog/free-property-management-software-options-in-2025",
		destination: "/blog",
	},
	{
		source:
			"/blog/free-property-management-software-options-in-2025-a-guide-for-new-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/freeze-prone-climate-rental-winterization-checklist",
		destination: "/blog",
	},
	{
		source:
			"/blog/from-single-door-to-five-a-practical-playbook-for-scaling-to-50-rental-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/handling-difficult-tenants-professionally-a-guide-for-self-managing-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/handling-inspection-disputes-with-tenants",
		destination: "/blog",
	},
	{
		source:
			"/blog/handling-inspection-disputes-with-tenants-a-guide-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/hard-inquiries-on-applicant-credit-reports",
		destination: "/blog",
	},
	{
		source:
			"/blog/hemlane-alternatives-under-25-month-best-property-management-software-for-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/hemlane-alternatives-under-40-month-a-smart-landlord-s-guide-to-affordable-property-software",
		destination: "/compare",
	},
	{
		source:
			"/blog/hemlane-pricing-breakdown-and-hidden-fees-what-independent-landlords-need-to-know",
		destination: "/compare",
	},
	{
		source:
			"/blog/hemlane-review-is-it-worth-the-price-for-tech-savvy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/hemlane-vs-doorloop-2026-comparison",
		destination: "/compare",
	},
	{
		source: "/blog/hemlane-vs-innago-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/hemlane-vs-landlord-studio-2026",
		destination: "/compare",
	},
	{
		source: "/blog/hemlane-vs-rentredi-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/hemlane-vs-resman-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/hemlane-vs-simplifyem-vs-tenantflow-the-definitive-2025-comparison-for-independent-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/hemlane-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/hoa-fees-special-assessments-rental-deduction",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-remote-landlords-use-tenantflow-to-manage-properties-without-being-on-site",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-handle-tenant-complaints-effectively-a-guide-for-the-smart-landlord",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-20-a-strategic-guide-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-5-as-a-single-property-owner",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-increase-rental-income-by-50-without-losing-your-sanity",
		destination: "/blog",
	},
	{
		source: "/blog/how-to-manage-1-rental-property-without-expensive-software",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-manage-10-rental-properties-without-expensive-software",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-manage-3-rental-properties-without-expensive-property-software",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-manage-50-rental-properties-without-expensive-software",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-reduce-maintenance-costs-by-5-a-strategic-guide-for-independent-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/how-to-scale-from-1-to-10-rental-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-scale-from-10-to-20-rental-properties-a-commercial-landlord-s-guide",
		destination: "/blog",
	},
	{
		source: "/blog/how-to-scale-from-3-to-6-rental-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-100-rental-properties-the-independent-landlord-s-guide",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-250-rental-properties-without-losing-your-mind",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-500-rental-properties-without-losing-your-mind",
		destination: "/blog",
	},
	{
		source: "/blog/how-to-spot-doctored-bank-statements",
		destination: "/blog",
	},
	{
		source: "/blog/humid-south-rental-mold-moisture-maintenance",
		destination: "/blog",
	},
	{
		source: "/blog/hurricane-season-rental-property-prep-checklist",
		destination: "/blog",
	},
	{
		source: "/blog/illinois-security-deposit-law-return-act-chicago-rlto",
		destination: "/blog",
	},
	{
		source: "/blog/indiana-security-deposit-law-45-day-return-itemization",
		destination: "/blog",
	},
	{
		source: "/blog/inherited-rental-stepped-up-basis-depreciation",
		destination: "/blog",
	},
	{
		source:
			"/blog/innago-alternatives-under-40-month-a-practical-guide-for-commercial-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/innago-pricing-breakdown-and-hidden-fees-a-honest-look-for-property-investors",
		destination: "/compare",
	},
	{
		source:
			"/blog/innago-review-is-it-worth-the-price-for-commercial-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/innago-vs-apartments-com-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/innago-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/innago-vs-doorloop-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/innago-vs-resman-vs-tenantflow-the-definitive-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/innago-vs-tenantcloud-2026-comparison",
		destination: "/compare",
	},
	{
		source: "/blog/iowa-security-deposit-law-two-month-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/kansas-security-deposit-law-one-month-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/kentucky-security-deposit-law-urlta-return-deadlines",
		destination: "/blog",
	},
	{
		source: "/blog/land-improvements-15-year-depreciation-fences-driveways",
		destination: "/blog",
	},
	{
		source: "/blog/landlord-education-books-courses-deduction",
		destination: "/blog",
	},
	{
		source:
			"/blog/landlord-insurance-explained-for-beginners-protecting-your-rental-income",
		destination: "/blog",
	},
	{
		source: "/blog/landlord-insurance-premium-deduction-schedule-e",
		destination: "/blog",
	},
	{
		source:
			"/blog/landlord-studio-review-is-it-worth-the-price-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/landlord-studio-vs-innago-vs-tenantflow-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/landlord-studio-vs-resman-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/landlord-studio-vs-resman-complete-comparison-for-2025-and-why-independent-landlords-are-moving-to-tenantflow",
		destination: "/compare",
	},
	{
		source: "/blog/landlord-studio-vs-simplifyem-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/landlord-studio-vs-tenantcloud-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/landlord-travel-deduction-local-out-of-town",
		destination: "/blog",
	},
	{
		source: "/blog/landlord-utilities-deduction-schedule-e",
		destination: "/blog",
	},
	{
		source: "/blog/landlord-walkthrough-credit-report-tradelines",
		destination: "/blog",
	},
	{
		source: "/blog/late-payment-patterns-on-credit-reports",
		destination: "/blog",
	},
	{
		source: "/blog/legal-accounting-fees-landlord-deduction",
		destination: "/blog",
	},
	{
		source: "/blog/louisiana-security-deposit-law-30-day-return-deadline",
		destination: "/blog",
	},
	{
		source: "/blog/maine-security-deposit-law-two-month-cap-return-deadlines",
		destination: "/blog",
	},
	{
		source: "/blog/managing-contractors-from-a-distance",
		destination: "/blog",
	},
	{
		source: "/blog/maryland-security-deposit-law-45-day-return-interest",
		destination: "/blog",
	},
	{
		source:
			"/blog/massachusetts-security-deposit-law-one-month-cap-strict-rules",
		destination: "/blog",
	},
	{
		source:
			"/blog/mastering-the-brrrr-method-a-strategic-guide-for-single-property-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/medical-debt-on-tenant-credit-reports",
		destination: "/blog",
	},
	{
		source: "/blog/michigan-security-deposit-law-cap-checklist-itemization",
		destination: "/blog",
	},
	{
		source: "/blog/mid-month-convention-rental-depreciation-proration",
		destination: "/blog",
	},
	{
		source: "/blog/minnesota-security-deposit-law-21-day-return-interest",
		destination: "/blog",
	},
	{
		source: "/blog/missed-depreciation-form-3115-fix",
		destination: "/blog",
	},
	{
		source: "/blog/missouri-security-deposit-law-two-month-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/montana-security-deposit-law-return-deadlines-deductions",
		destination: "/blog",
	},
	{
		source: "/blog/mortgage-interest-deduction-rental-property-schedule-e",
		destination: "/blog",
	},
	{
		source: "/blog/nebraska-security-deposit-law-one-month-cap-14-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/nevada-security-deposit-law-three-month-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/new-hampshire-security-deposit-law-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/new-jersey-security-deposit-law-cap-interest-30-day-return",
		destination: "/blog",
	},
	{
		source:
			"/blog/new-mexico-security-deposit-law-limits-interest-30-day-return",
		destination: "/blog",
	},
	{
		source:
			"/blog/new-york-security-deposit-law-hstpa-one-month-cap-14-day-return",
		destination: "/blog",
	},
	{
		source:
			"/blog/north-carolina-security-deposit-law-tiered-caps-return-rules",
		destination: "/blog",
	},
	{
		source:
			"/blog/north-dakota-security-deposit-law-one-month-cap-30-day-return",
		destination: "/blog",
	},
	{
		source: "/blog/offer-letters-as-income-proof",
		destination: "/blog",
	},
	{
		source: "/blog/ohio-security-deposit-law-30-day-return-interest-damages",
		destination: "/blog",
	},
	{
		source: "/blog/photography-tips-for-rental-listings",
		destination: "/blog",
	},
	{
		source: "/blog/pmi-deduction-rental-property-mortgage-insurance",
		destination: "/blog",
	},
	{
		source: "/blog/property-management-fees-leasing-commissions-deduction",
		destination: "/blog",
	},
	{
		source: "/blog/property-management-for-out-of-state-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/property-management-software-subscription-deduction",
		destination: "/blog",
	},
	{
		source:
			"/blog/propertyware-alternatives-under-100-month-a-simple-guide-for-small-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/propertyware-alternatives-under-30-month-a-practical-guide-for-diy-landlords",
		destination: "/compare",
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
		destination: "/compare",
	},
	{
		source: "/blog/propertyware-vs-hemlane-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/propertyware-vs-innago-vs-tenantflow-the-definitive-guide-for-small-landlords-in-2025",
		destination: "/compare",
	},
	{
		source: "/blog/propertyware-vs-resman-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/propertyware-vs-simplifyem-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/propertyware-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/qualifying-applicants-with-seasonal-variable-income",
		destination: "/blog",
	},
	{
		source: "/blog/reading-credit-utilization-on-tenant-credit-reports",
		destination: "/blog",
	},
	{
		source: "/blog/refrigerator-coil-cleaning-rental-appliance-life",
		destination: "/blog",
	},
	{
		source: "/blog/rent-manager-alternatives-under-100-month",
		destination: "/blog",
	},
	{
		source:
			"/blog/rent-manager-alternatives-under-100-month-a-strategic-guide-for-professional-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/rent-manager-pricing-breakdown-and-hidden-fees-what-independent-landlords-need-to-know",
		destination: "/compare",
	},
	{
		source:
			"/blog/rent-manager-pricing-breakdown-and-hidden-fees-what-you-need-to-know-before-you-subscribe",
		destination: "/blog",
	},
	{
		source:
			"/blog/rent-manager-review-is-it-worth-the-price-for-the-independent-landlord",
		destination: "/compare",
	},
	{
		source:
			"/blog/rent-manager-vs-landlord-studio-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/rent-manager-vs-propertyware-2026",
		destination: "/compare",
	},
	{
		source: "/blog/rent-manager-vs-rentredi-complete-comparison-for-2025",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/rent-manager-vs-resman-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/rent-manager-vs-stessa-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/rental-caulk-grout-maintenance-schedule",
		destination: "/blog",
	},
	{
		source: "/blog/rental-chimney-fireplace-maintenance-schedule",
		destination: "/blog",
	},
	{
		source: "/blog/rental-closing-costs-deductible-amortized-basis",
		destination: "/blog",
	},
	{
		source: "/blog/rental-deck-safety-inspection-guide",
		destination: "/blog",
	},
	{
		source: "/blog/rental-depreciation-27-5-year-straight-line",
		destination: "/blog",
	},
	{
		source: "/blog/rental-driveway-walkway-maintenance-liability",
		destination: "/blog",
	},
	{
		source: "/blog/rental-dryer-vent-cleaning-fire-risk",
		destination: "/blog",
	},
	{
		source: "/blog/rental-garbage-disposal-maintenance-tenant-education",
		destination: "/blog",
	},
	{
		source: "/blog/rental-gutter-maintenance-ice-dams-foundation",
		destination: "/blog",
	},
	{
		source: "/blog/rental-irrigation-system-maintenance-guide",
		destination: "/blog",
	},
	{
		source: "/blog/rental-property-tax-deduction-schedule-e-salt-cap",
		destination: "/blog",
	},
	{
		source: "/blog/rental-roof-inspection-what-to-check",
		destination: "/blog",
	},
	{
		source: "/blog/rental-sewer-line-maintenance-camera-inspection",
		destination: "/blog",
	},
	{
		source: "/blog/rental-smoke-co-detector-maintenance-schedule",
		destination: "/blog",
	},
	{
		source: "/blog/rental-sump-pump-maintenance-testing-backup",
		destination: "/blog",
	},
	{
		source: "/blog/rental-tree-trimming-schedule-roof-sewer-storm",
		destination: "/blog",
	},
	{
		source: "/blog/rental-window-maintenance-seals-screens",
		destination: "/blog",
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-20-month-a-practical-guide-for-small-landlords",
		destination:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-40-month-a-streamlined-approach-for-independent-landlords",
		destination:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-75-month-for-tech-savvy-landlords",
		destination:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
	},
	{
		source:
			"/blog/rentec-direct-vs-apartments-com-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/rentec-direct-vs-avail-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/rentec-direct-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/rentec-direct-vs-yardi-breeze-2026",
		destination:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
	},
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
	{
		source: "/blog/rentredi-vs-innago-2026",
		destination: "/compare/rentredi",
	},
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
		destination: "/blog",
	},
	{
		source:
			"/blog/resman-alternatives-under-20-month-a-smarter-path-for-independent-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/resman-alternatives-under-25-month-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/resman-review-is-it-worth-the-price-for-first-time-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/resman-vs-rent-manager-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/resman-vs-simplifyem-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/resman-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/roof-lifespan-by-material-rentals",
		destination: "/blog",
	},
	{
		source: "/blog/routine-upkeep-landscaping-pest-control-deduction",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-10-to-100-rental-properties-a-landlord-s-growth-blueprint",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-10-to-20-rental-properties-a-practical-guide-for-independent-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-10-to-20-rental-properties-a-self-managing-landlord-s-guide",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-10-to-30-rental-properties-the-operational-challenge-for-independent-investors",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-20-to-100-rental-properties-a-practical-guide-for-diy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-20-to-200-rental-properties-a-practical-guide-for-independent-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-20-to-40-rental-properties-the-operational-shift-every-landlord-must-master",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-3-to-30-rental-properties-a-vacation-rental-owner-s-guide",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-3-to-30-rental-properties-the-operational-shift-every-landlord-must-make",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-3-to-9-rental-properties-a-practical-guide-for-the-budget-conscious-landlord",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-5-to-15-rental-properties-a-practical-guide-for-busy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-5-to-15-rental-properties-landlord-tips-for-growth-without-burning-out",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-5-to-25-rental-properties-the-independent-landlord-s-playbook",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-50-to-250-rental-properties-the-operational-blueprint-for-remote-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/schedule-e-line-19-other-expenses-examples",
		destination: "/blog",
	},
	{
		source: "/blog/screening-applicants-with-thin-credit-files",
		destination: "/blog",
	},
	{
		source: "/blog/screening-gig-workers-variable-income",
		destination: "/blog",
	},
	{
		source: "/blog/screening-housing-voucher-applicants-legally",
		destination: "/blog",
	},
	{
		source: "/blog/section-179-vs-bonus-depreciation-rentals",
		destination: "/compare",
	},
	{
		source: "/blog/security-deposit-deadlines-and-caps-all-50-states",
		destination: "/blog",
	},
	{
		source:
			"/blog/security-deposit-laws-by-state-your-rent-collection-property-management-guide-for-diy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/security-deposit-management-best-practices-for-small-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/security-systems-for-remote-monitoring-essential-tips-for-self-managing-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/simplifyem-alternatives-under-100-month-a-guide-for-new-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/simplifyem-alternatives-under-40-month-for-diy-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-alternatives-under-75-month-a-landlord-s-guide-to-streamlined-property-management",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-pricing-breakdown-and-hidden-fees-what-every-property-investor-needs-to-know",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-pricing-breakdown-and-hidden-fees-why-independent-landlords-choose-tenantflow",
		destination: "/compare",
	},
	{
		source: "/blog/simplifyem-vs-avail-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/simplifyem-vs-avail-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/simplifyem-vs-hemlane-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-vs-innago-a-2026-comparison-for-independent-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-vs-propertyware-a-detailed-comparison-for-2026-with-tenantflow",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-vs-propertyware-vs-tenantflow-the-best-software-for-budget-conscious-landlords-in-2025",
		destination: "/compare",
	},
	{
		source: "/blog/simplifyem-vs-rent-manager-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/simplifyem-vs-rentec-direct-complete-comparison-for-2025",
		destination:
			"/blog/buildium-vs-rentec-direct-complete-comparison-for-2026-and-why-tenantflow-wins-for-independent-landlords",
	},
	{
		source:
			"/blog/simplifyem-vs-turbotenant-vs-tenantflow-the-definitive-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/simplifyem-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/smart-home-technology-for-rentals-a-guide-for-remote-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/soft-pull-vs-hard-pull-tenant-screening",
		destination: "/compare",
	},
	{
		source: "/blog/spotting-fake-paystubs-rental-applications",
		destination: "/blog",
	},
	{
		source: "/blog/spring-rental-maintenance-checklist",
		destination: "/blog",
	},
	{
		source: "/blog/standardized-income-verification-document-packet",
		destination: "/blog",
	},
	{
		source:
			"/blog/stessa-alternatives-under-40-month-a-better-fit-for-independent-commercial-landlords",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source:
			"/blog/stessa-alternatives-under-50-month-a-comparison-for-tech-savvy-landlords",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/stessa-vs-avail-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-buildium-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/stessa-vs-innago-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-landlord-studio-2026-comparison",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-rent-manager-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-rentredi-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/stessa-vs-simplifyem-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-turbotenant-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/stessa-vs-turbotenant-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source:
			"/blog/stessa-vs-zillow-rental-manager-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source:
			"/blog/streamlining-the-move-in-and-move-out-process-a-guide-for-independent-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/summer-rental-maintenance-checklist",
		destination: "/blog",
	},
	{
		source: "/blog/supplies-small-tools-landlord-deduction",
		destination: "/blog",
	},
	{
		source: "/blog/tenant-screening-checklist-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source: "/blog/tenant-screening-tips-for-new-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/tenantcloud-alternatives-under-40-month",
		destination: "/compare",
	},
	{
		source: "/blog/tenantcloud-vs-apartments-com-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/tenantcloud-vs-landlord-studio-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/tenantcloud-vs-stessa-complete-comparison-for-2025",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/tenantcloud-vs-stessa-complete-comparison-for-2026",
		destination:
			"/blog/avail-vs-stessa-vs-tenantflow-the-definitive-comparison-for-2025",
	},
	{
		source: "/blog/tenantcloud-vs-yardi-breeze-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-coverage-gaps-landlords-often-miss-and-how-to-fix-them-with-smart-property-management",
		destination: "/blog",
	},
	{
		source:
			"/blog/tenantflow-pricing-vs-competitors-a-landlord-s-guide-for-beginners",
		destination: "/compare",
	},
	{
		source: "/blog/tenantflow-success-stories-from-remote-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/tenantflow-success-stories-from-self-managing-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/tenantflow-success-stories-how-independent-landlords-scale-without-the-overhead",
		destination: "/blog",
	},
	{
		source: "/blog/tenantflow-vs-cozy-complete-comparison",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-vs-doorloop-complete-comparison-for-first-time-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-vs-hemlane-complete-comparison-for-commercial-landlords",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-vs-hemlane-complete-comparison-for-commercial-landlords-in-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-vs-landlord-studio-a-practical-comparison-for-the-remote-landlord",
		destination: "/compare",
	},
	{
		source:
			"/blog/tenantflow-vs-resman-a-clear-comparison-for-budget-conscious-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/the-3x-rent-to-income-rule-and-alternatives",
		destination: "/compare",
	},
	{
		source:
			"/blog/the-best-property-management-software-under-100-a-month-for-independent-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/the-brrrr-method-explained-for-professional-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-brrrr-method-explained-for-property-investors-a-landlord-s-guide-to-scaling-with-tenantflow",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-definitive-guide-to-seasonal-property-inspections-for-professional-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-definitive-tenant-screening-checklist-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-budget-conscious-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/the-essential-tenant-screening-checklist-for-busy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-independent-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-remote-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-essential-tenant-screening-checklist-for-remote-landlords-a-guide-for-beginners",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-first-time-landlord-s-guide-to-property-management-software-streamlining-your-rental-business",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-hidden-costs-of-free-rent-administration-why-independent-landlords-need-a-better-alternative-to-avail",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-independent-landlord-s-guide-to-regular-property-inspection-schedules",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-independent-landlord-s-guide-to-the-top-20-property-management-apps-and-why-simplification-wins",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-mobile-reality-why-a-true-landlord-software-platform-must-extend-beyond-the-desktop",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-property-management-app-dilemma-a-simple-guide-for-the-tech-savvy-small-landlord",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-real-cost-of-free-property-management-a-budget-conscious-landlord-s-guide-to-50-apps",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-realistic-guide-to-property-management-software-for-independent-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-realistic-guide-to-property-management-software-for-small-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-reality-of-top-100-lists-a-curated-guide-for-the-serious-landlord",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-right-tools-for-the-independent-landlord-cutting-through-the-noise-of-top-100-lists",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-smart-landlord-s-guide-to-choosing-the-right-property-management-software",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-smart-landlord-s-guide-to-property-management-software-for-tech-savvy-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-strategic-blueprint-scaling-your-rental-portfolio-from-3-to-6-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-top-property-management-apps-for-tech-savvy-landlords-a-streamlined-comparison",
		destination: "/blog",
	},
	{
		source:
			"/blog/the-ultimate-tenant-screening-checklist-for-professional-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-1-property-management-app-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-1-property-management-app-for-single-property-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-10-property-management-apps-for-multi-family-investors-budget-friendly-options",
		destination: "/blog",
	},
	{
		source: "/blog/top-10-property-management-apps-for-single-property-owners",
		destination: "/blog",
	},
	{
		source: "/blog/top-10-property-management-apps-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source: "/blog/top-100-property-management-apps-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-100-property-management-apps-for-real-estate-beginners",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-100-property-management-apps-for-self-managing-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-100-property-management-apps-for-self-managing-landlords-a-focused-guide-for-the-independent-owner",
		destination: "/blog",
	},
	{
		source: "/blog/top-20-property-management-apps-for-diy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-professional-landlords-a-focused-review-for-the-independent-investor",
		destination: "/compare",
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-single-property-landlords-a-streamlined-guide-for-the-independent-landlord",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-20-property-management-apps-for-vacation-rental-owners-a-guide-for-professional-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-3-property-management-apps-for-commercial-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-3-property-management-apps-for-multi-family-investors-a-diy-landlord-s-guide",
		destination: "/blog",
	},
	{
		source: "/blog/top-3-property-management-apps-for-professional-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-3-property-management-apps-for-professional-self-managing-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-budget-conscious-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-5-property-management-apps-for-busy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-5-property-management-apps-for-diy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-5-property-management-apps-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-first-time-landlords-remote-friendly",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-real-estate-beginners-a-landlord-centric-comparison",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-5-property-management-apps-for-single-property-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-5-property-management-apps-for-small-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-5-property-management-apps-for-tech-savvy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-50-property-management-apps-for-small-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/top-50-property-management-apps-for-small-landlords-budget-friendly-easy-to-use",
		destination: "/blog",
	},
	{
		source: "/blog/top-50-property-management-apps-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/turbotenant-alternatives-under-25-month-best-rental-management-software-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/turbotenant-alternatives-under-25-month-for-independent-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/turbotenant-vs-apartments-com-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/turbotenant-vs-apartments-com-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/turbotenant-vs-appfolio-complete-comparison-for-2025",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/turbotenant-vs-innago-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/turbotenant-vs-propertyware-vs-tenantflow-the-definitive-2026-guide-for-independent-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/turbotenant-vs-tenantcloud-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/turbotenant-vs-zillow-rental-manager-2026",
		destination: "/compare",
	},
	{
		source: "/blog/twelve-month-preventive-maintenance-calendar-rentals",
		destination: "/blog",
	},
	{
		source: "/blog/using-zapier-for-property-management",
		destination: "/blog",
	},
	{
		source: "/blog/vantagescore-vs-fico-vs-residentscore-screening-reports",
		destination: "/compare",
	},
	{
		source: "/blog/vendor-management-for-property-owners-a-beginner-s-guide",
		destination: "/blog",
	},
	{
		source: "/blog/verifying-commission-based-income",
		destination: "/blog",
	},
	{
		source: "/blog/verifying-retirement-income-rental-applicants",
		destination: "/blog",
	},
	{
		source: "/blog/verifying-self-employed-applicant-income",
		destination: "/blog",
	},
	{
		source: "/blog/virtual-tours-that-attract-quality-tenants",
		destination: "/blog",
	},
	{
		source: "/blog/washing-machine-hose-replacement-schedule-rentals",
		destination: "/blog",
	},
	{
		source:
			"/blog/what-to-look-for-during-inspections-a-practical-guide-for-single-property-owners",
		destination: "/blog",
	},
	{
		source: "/blog/why-credit-score-alone-misleads-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/why-professional-landlords-are-moving-from-complex-suites-to-focused-workflows",
		destination: "/blog",
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-diy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-small-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/why-tenantflow-is-the-best-choice-for-tech-savvy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/wildfire-zone-rental-defensible-space-maintenance",
		destination: "/blog",
	},
	{
		source: "/blog/winter-rental-maintenance-checklist",
		destination: "/blog",
	},
	{
		source:
			"/blog/yardi-breeze-alternatives-under-100-month-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source:
			"/blog/yardi-breeze-alternatives-under-50-month-a-pragmatic-guide-for-new-landlords",
		destination: "/compare",
	},
	{
		source: "/blog/yardi-breeze-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{
		source:
			"/blog/yardi-breeze-vs-zillow-rental-manager-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/zillow-rental-manager-alternatives-under-30-month-a-guide-for-the-independent-landlord",
		destination: "/compare",
	},
	{
		source: "/blog/zillow-rental-manager-alternatives-under-50-month",
		destination: "/blog",
	},
	{
		source: "/blog/zillow-rental-manager-alternatives-under-75-month",
		destination: "/compare",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-buildium-vs-tenantflow-the-definitive-2025-guide-for-independent-landlords",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-doorloop-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/zillow-rental-manager-vs-innago-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-innago-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-rent-manager-vs-tenantflow-the-2026-guide-for-budget-conscious-landlords",
		destination: "/compare",
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
		destination: "/compare",
	},
];
