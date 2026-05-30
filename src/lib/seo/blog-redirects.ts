// Auto-generated 301 redirect map for the deleted Phase-1 blog catalogue.
// Source: tenantflow-seo-audit-bucketed.csv (GSC ghost URLs) cross-referenced
// against the 9 live published slugs. The Phase-6 rebuild hard-deleted ~100
// Phase-1 posts (migration 20260510214942_phase_6_delete_phase_1_broken_drafts);
// with dynamicParams=false on /blog/[slug] those slugs now HTTP-404. These 301s
// transfer the accumulated Google ranking signal (positions 6-13, ~10.9k impr/qtr)
// to a live equivalent instead of bleeding it on bare 404s. Targeting: a slug
// mentioning a /compare hub competitor (appfolio|rentredi|buildium) -> that hub;
// other comparison (-vs-) -> /compare; generic guides -> /blog.
// See .planning/seo-audit/ANALYSIS-2026-05-29.md.
//
// REPUBLISH-RECLAIM (Hybrid plan, top-10 first): when a quality replacement is
// published at one of these slugs, DELETE that entry so the new post serves
// instead of redirecting.

export interface BlogRedirect {
	readonly source: string;
	readonly destination: string;
}

export const DELETED_BLOG_REDIRECTS: readonly BlogRedirect[] = [
	{
		source: "/blog/apartments-com-vs-rentredi-complete-comparison-for-2025",
		destination: "/compare/rentredi",
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
			"/blog/automated-rent-collection-complete-setup-guide-for-real-estate-beginners",
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
			"/blog/buildium-alternatives-under-40-month-for-first-time-landlords",
		destination: "/compare/buildium",
	},
	{
		source: "/blog/buildium-vs-landlord-studio-complete-comparison-for-2025",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/chatbots-for-tenant-communication-a-smart-solution-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source: "/blog/communication-tools-for-distant-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/cozy-alternatives-under-20-month-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/documenting-property-condition-properly-a-landlord-s-guide-to-smart-rental-management",
		destination: "/blog",
	},
	{
		source:
			"/blog/doorloop-alternatives-under-40-month-for-single-property-owners",
		destination: "/blog",
	},
	{
		source:
			"/blog/doorloop-review-is-it-worth-the-price-for-professional-landlords",
		destination: "/blog",
	},
	{ source: "/blog/error-1773361842137", destination: "/blog" },
	{ source: "/blog/error-1773377142161", destination: "/blog" },
	{ source: "/blog/error-1773381642106", destination: "/blog" },
	{ source: "/blog/error-1773387042170", destination: "/blog" },
	{ source: "/blog/error-1773404142143", destination: "/blog" },
	{ source: "/blog/error-1773415842160", destination: "/blog" },
	{ source: "/blog/error-1773435642141", destination: "/blog" },
	{ source: "/blog/error-1773455442145", destination: "/blog" },
	{ source: "/blog/error-1773480642166", destination: "/blog" },
	{ source: "/blog/error-1773509442122", destination: "/blog" },
	{ source: "/blog/error-1773542742136", destination: "/blog" },
	{ source: "/blog/error-1774345515152", destination: "/blog" },
	{ source: "/blog/error-1774355415169", destination: "/blog" },
	{ source: "/blog/error-1774389661320", destination: "/blog" },
	{ source: "/blog/error-1774403161350", destination: "/blog" },
	{ source: "/blog/error-1775084406050", destination: "/blog" },
	{ source: "/blog/error-1775358164015", destination: "/blog" },
	{ source: "/blog/error-1775646172238", destination: "/blog" },
	{ source: "/blog/error-1775703682122", destination: "/blog" },
	{ source: "/blog/error-1775833212132", destination: "/blog" },
	{ source: "/blog/error-1775948458122", destination: "/blog" },
	{
		source: "/blog/essential-property-management-tips-for-small-landlords",
		destination: "/blog",
	},
	{ source: "/blog/example-blog-post", destination: "/blog" },
	{
		source: "/blog/financial-reports-every-landlord-needs",
		destination: "/blog",
	},
	{
		source: "/blog/free-property-management-software-options-in-2025",
		destination: "/blog",
	},
	{
		source: "/blog/handling-inspection-disputes-with-tenants",
		destination: "/blog",
	},
	{
		source:
			"/blog/hemlane-alternatives-under-25-month-best-property-management-software-for-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/hemlane-review-is-it-worth-the-price-for-tech-savvy-landlords",
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
			"/blog/how-to-scale-from-10-to-20-rental-properties-a-commercial-landlord-s-guide",
		destination: "/blog",
	},
	{
		source: "/blog/how-to-scale-from-3-to-6-rental-properties",
		destination: "/blog",
	},
	{
		source:
			"/blog/how-to-scale-from-50-to-500-rental-properties-without-losing-your-mind",
		destination: "/blog",
	},
	{
		source: "/blog/innago-vs-buildium-complete-comparison-for-2026",
		destination: "/compare/buildium",
	},
	{
		source:
			"/blog/landlord-studio-review-is-it-worth-the-price-for-first-time-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/landlord-studio-vs-resman-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/landlord-studio-vs-simplifyem-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/managing-contractors-from-a-distance",
		destination: "/blog",
	},
	{
		source: "/blog/photography-tips-for-rental-listings",
		destination: "/blog",
	},
	{
		source: "/blog/property-management-for-out-of-state-landlords",
		destination: "/blog",
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
		source: "/blog/rent-manager-alternatives-under-100-month",
		destination: "/blog",
	},
	{
		source:
			"/blog/rent-manager-pricing-breakdown-and-hidden-fees-what-you-need-to-know-before-you-subscribe",
		destination: "/blog",
	},
	{
		source: "/blog/rent-manager-vs-resman-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/rentec-direct-alternatives-under-75-month-for-tech-savvy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/rentec-direct-vs-apartments-com-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/rentec-direct-vs-avail-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/rentredi-alternatives-under-30-month-for-budget-conscious-landlords",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/rentredi-pricing-breakdown-and-hidden-fees-what-every-small-landlord-needs-to-know",
		destination: "/compare/rentredi",
	},
	{
		source:
			"/blog/resman-alternatives-under-25-month-for-vacation-rental-owners",
		destination: "/blog",
	},
	{
		source: "/blog/resman-vs-rent-manager-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source:
			"/blog/scaling-from-10-to-100-rental-properties-a-landlord-s-growth-blueprint",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-10-to-20-rental-properties-a-self-managing-landlord-s-guide",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-3-to-30-rental-properties-a-vacation-rental-owner-s-guide",
		destination: "/blog",
	},
	{
		source:
			"/blog/scaling-from-5-to-15-rental-properties-landlord-tips-for-growth-without-burning-out",
		destination: "/blog",
	},
	{
		source:
			"/blog/security-deposit-laws-by-state-your-rent-collection-property-management-guide-for-diy-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/security-systems-for-remote-monitoring-essential-tips-for-self-managing-landlords",
		destination: "/blog",
	},
	{
		source:
			"/blog/simplifyem-pricing-breakdown-and-hidden-fees-what-every-property-investor-needs-to-know",
		destination: "/blog",
	},
	{
		source: "/blog/simplifyem-vs-avail-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/stessa-vs-appfolio-complete-comparison-for-2026",
		destination: "/compare/appfolio",
	},
	{
		source: "/blog/stessa-vs-rentredi-complete-comparison-for-2026",
		destination: "/compare/rentredi",
	},
	{
		source: "/blog/stessa-vs-simplifyem-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/stessa-vs-turbotenant-complete-comparison-for-2026",
		destination: "/compare",
	},
	{
		source: "/blog/tenant-screening-checklist-for-multi-family-investors",
		destination: "/blog",
	},
	{
		source: "/blog/tenantcloud-alternatives-under-40-month",
		destination: "/blog",
	},
	{
		source: "/blog/tenantcloud-vs-stessa-complete-comparison-for-2025",
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
		source: "/blog/top-20-property-management-apps-for-diy-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-3-property-management-apps-for-commercial-landlords",
		destination: "/blog",
	},
	{
		source: "/blog/top-3-property-management-apps-for-professional-landlords",
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
		source: "/blog/top-5-property-management-apps-for-small-landlords",
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
		source: "/blog/turbotenant-vs-apartments-com-complete-comparison-for-2025",
		destination: "/compare",
	},
	{
		source: "/blog/using-zapier-for-property-management",
		destination: "/blog",
	},
	{
		source: "/blog/vendor-management-for-property-owners-a-beginner-s-guide",
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
		source:
			"/blog/yardi-breeze-alternatives-under-100-month-for-multi-family-investors",
		destination: "/blog",
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
		source: "/blog/zillow-rental-manager-alternatives-under-50-month",
		destination: "/blog",
	},
	{
		source:
			"/blog/zillow-rental-manager-vs-tenantcloud-complete-comparison-for-2026",
		destination: "/compare",
	},
];
