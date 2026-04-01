export type FeatureSupport = 'yes' | 'no' | 'partial' | 'addon'

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
