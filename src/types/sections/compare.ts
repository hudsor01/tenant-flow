// `na` — Not applicable / by design. Used for features that TenantFlow
// intentionally does NOT support (e.g. ACH rent collection, HOA management
// on the landlord-only platform). Renders with neutral muted styling, not a
// destructive red ✗, since these are positioning choices not gaps.
export type FeatureSupport = "yes" | "no" | "partial" | "addon" | "na";

export interface FeatureRow {
	name: string;
	tenantflow: FeatureSupport;
	tenantflowNote?: string;
	competitor: FeatureSupport;
	competitorNote?: string;
}

export interface PricingTier {
	name: string;
	price: string;
	note?: string;
}

/**
 * One product's row in the `/compare` hub's summary table (2026-11-24 SEO
 * audit C6). A competitor's cells state only what its own pricing page said
 * on `checkedAt`.
 */
export interface CompareSummary {
	startingPrice: string;
	minimum: string;
	tenantAccess: string;
	rentPayments: string;
	leaseESign: string;
	documents: string;
}

export interface CompetitorData {
	name: string;
	slug: string;
	/** A published post comparing this competitor, shown as "Read the Full Comparison". */
	blogSlug?: string;
	tagline: string;
	description: string;
	metaDescription: string;
	heroSubtitle: string;
	/**
	 * The competitor's Capterra / G2 rating, as read on `checkedAt`. Omitted
	 * when the competitor has no listing; the page then shows no tile.
	 */
	capterra?: string;
	g2?: string;
	/**
	 * When the competitor's prices, ratings and figures were last read from
	 * their own pages (YYYY-MM-DD). Shown as "as of <Month YYYY>"; a unit test
	 * fails once it is more than 180 days old.
	 */
	checkedAt: string;
	/** Where the prices were read, e.g. "buildium.com/pricing". */
	pricingSource: string;
	founded: string;
	bestFor: string;
	tenantflowPricing: PricingTier[];
	competitorPricing: PricingTier[];
	features: FeatureRow[];
	summary: CompareSummary;
	whySwitch: string[];
	competitorStrengths: string[];
}
