// `na` — Not applicable / by design. Used for features that TenantFlow
// intentionally does NOT support (e.g. ACH rent collection, HOA management
// on the landlord-only platform). Renders with neutral muted styling, not a
// destructive red ✗, since these are positioning choices not gaps.
export type FeatureSupport = 'yes' | 'no' | 'partial' | 'addon' | 'na'

export interface FeatureRow {
	name: string
	tenantflow: FeatureSupport
	tenantflowNote?: string
	competitor: FeatureSupport
	competitorNote?: string
}

export interface PricingTier {
	name: string
	price: string
	note?: string
}

export interface CompetitorData {
	name: string
	slug: string
	blogSlug: string
	tagline: string
	description: string
	metaDescription: string
	heroSubtitle: string
	capterra: string
	g2: string
	founded: string
	bestFor: string
	tenantflowPricing: PricingTier[]
	competitorPricing: PricingTier[]
	features: FeatureRow[]
	whySwitch: string[]
	competitorStrengths: string[]
}
