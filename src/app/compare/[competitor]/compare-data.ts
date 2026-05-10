import type { CompetitorData, PricingTier } from '#types/sections/compare'

// Competitor review aggregates and pricing snapshots are captured manually
// from each vendor's public Capterra / G2 / pricing page. Source: 2026-04-29
// review of Buildium, AppFolio, RentRedi public listings. Refresh quarterly
// or whenever a competitor materially changes their pricing.

const TENANTFLOW_PRICING: PricingTier[] = [
	{ name: 'Starter', price: '$29/mo', note: 'Up to 5 properties, 25 units' },
	{ name: 'Growth', price: '$79/mo', note: 'Up to 20 properties, 100 units' },
	{
		name: 'Max',
		price: '$199/mo',
		note: 'Unlimited properties and units',
	},
]

export const COMPETITORS: Record<string, CompetitorData> = {
	buildium: {
		name: 'Buildium',
		slug: 'buildium',
		blogSlug: 'tenantflow-vs-buildium-comparison',
		tagline: 'The Modern Buildium Alternative',
		description:
			'See why landlords are switching from Buildium to TenantFlow for lower costs, modern features, and a better tenant experience.',
		metaDescription:
			'Looking for a Buildium alternative? TenantFlow offers the same features at half the price. Compare pricing, features, and see why landlords are switching.',
		heroSubtitle:
			'Buildium starts at $58/month. TenantFlow starts at $29/month with the same core features, modern technology, and no hidden fees.',
		capterra: '4.5/5 (2,131 reviews)',
		g2: '4.4/5 (220+ reviews)',
		founded: '2004',
		bestFor: 'Small to mid-sized property managers and HOA management',
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{ name: 'Essential', price: '$58/mo', note: 'Basic features' },
			{
				name: 'Growth',
				price: '$183/mo',
				note: 'Advanced features + analytics',
			},
			{
				name: 'Premium',
				price: '$375/mo',
				note: 'Full suite + priority support',
			},
		],
		features: [
			{
				name: 'Document Vault',
				tenantflow: 'yes',
				tenantflowNote: 'Per-entity, global search',
				competitor: 'partial',
				competitorNote: 'Basic file storage',
			},
			{
				name: 'Maintenance Records',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				tenantflowNote: 'Lease e-sign (Growth+)',
				competitor: 'yes',
			},
			{ name: 'Tenant Records', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Financial Reporting',
				tenantflow: 'yes',
				competitor: 'yes',
				competitorNote: 'More mature accounting',
			},
			{
				name: 'Background Checks',
				tenantflow: 'no',
				tenantflowNote: 'Use a third-party service',
				competitor: 'yes',
			},
			{
				name: 'ACH / Payment Processing',
				tenantflow: 'no',
				tenantflowNote: 'Landlord-only platform',
				competitor: 'yes',
			},
			{
				name: 'HOA Management',
				tenantflow: 'no',
				competitor: 'yes',
				competitorNote: 'Violation tracking included',
			},
			{
				name: 'Modern Tech Stack',
				tenantflow: 'yes',
				tenantflowNote: 'Cloud-native React',
				competitor: 'no',
				competitorNote: 'Legacy codebase',
			},
			{
				name: 'Transparent Pricing',
				tenantflow: 'yes',
				competitor: 'partial',
				competitorNote: 'Add-on costs',
			},
		],
		whySwitch: [
			'Save over $1,200/year compared to Buildium Growth ($79/mo vs $183/mo)',
			'Modern, fast interface built on cloud-native technology',
			'Per-entity document vault with global search included on every plan',
			'14-day free trial with no credit card required',
			'Purpose-built for individual landlords — admin, documents, and records without accounting bloat',
		],
		competitorStrengths: [
			'HOA and community association management features',
			'Mature full-service accounting with 1099 e-filing',
			'20 years of industry presence and extensive documentation',
			'Large integration ecosystem',
		],
	},
	appfolio: {
		name: 'AppFolio',
		slug: 'appfolio',
		blogSlug: 'tenantflow-vs-appfolio-comparison',
		tagline: 'The AppFolio Alternative for Landlords',
		description:
			'AppFolio requires 50+ units and $298/month minimum. TenantFlow starts at $29/month with no minimums. Compare features and pricing.',
		metaDescription:
			'AppFolio alternative for landlords — no unit minimums. TenantFlow starts at $29/mo vs AppFolio\'s $298/mo minimum. No unit requirements.',
		heroSubtitle:
			'AppFolio requires a minimum of 50 units and $298/month. TenantFlow has no minimums and starts at $29/month — professional tools for any portfolio size.',
		capterra: '4.5/5',
		g2: '4.6/5',
		founded: '2006',
		bestFor: 'Property management companies with 50+ units',
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{
				name: 'Core',
				price: '$298/mo min',
				note: '50-unit minimum, custom pricing',
			},
			{
				name: 'Plus',
				price: 'Custom',
				note: 'Advanced features, custom pricing',
			},
			{
				name: 'Max',
				price: 'Custom',
				note: 'Enterprise features, custom pricing',
			},
		],
		features: [
			{
				name: 'Document Vault',
				tenantflow: 'yes',
				tenantflowNote: 'Per-entity, global search',
				competitor: 'partial',
				competitorNote: 'Basic file storage',
			},
			{
				name: 'Maintenance Records',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
				competitorNote: 'AI-powered routing',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				tenantflowNote: 'Lease e-sign (Growth+)',
				competitor: 'yes',
				competitorNote: 'AI leasing assistant',
			},
			{ name: 'Tenant Records', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Financial Reporting',
				tenantflow: 'yes',
				competitor: 'yes',
				competitorNote: 'Full double-entry accounting',
			},
			{
				name: 'Background Checks',
				tenantflow: 'no',
				tenantflowNote: 'Use a third-party service',
				competitor: 'yes',
			},
			{
				name: 'ACH / Payment Processing',
				tenantflow: 'no',
				tenantflowNote: 'Landlord-only platform',
				competitor: 'yes',
			},
			{
				name: 'Listing Syndication',
				tenantflow: 'no',
				competitor: 'yes',
				competitorNote: 'Built-in marketing tools',
			},
			{
				name: 'Commercial Properties',
				tenantflow: 'no',
				competitor: 'yes',
				competitorNote: 'Multi-type support',
			},
			{
				name: 'No Unit Minimums',
				tenantflow: 'yes',
				tenantflowNote: 'Start with 1 unit',
				competitor: 'no',
				competitorNote: '50-unit minimum',
			},
			{
				name: 'Transparent Pricing',
				tenantflow: 'yes',
				competitor: 'no',
				competitorNote: 'Custom quotes only',
			},
			{
				name: 'Free Trial',
				tenantflow: 'yes',
				tenantflowNote: '14-day, no credit card',
				competitor: 'no',
				competitorNote: 'Demo only',
			},
			{
				name: 'Modern Tech Stack',
				tenantflow: 'yes',
				tenantflowNote: 'Cloud-native React',
				competitor: 'partial',
				competitorNote: 'AI features added recently',
			},
		],
		whySwitch: [
			'No unit minimums — manage 1 unit or 100 without restrictions',
			'Save over $2,600/year at 30 units ($79/mo vs $298/mo minimum)',
			'Transparent pricing — no custom quotes or sales calls needed',
			'14-day free trial to test everything before committing',
			'Per-entity document vault and Lease e-sign (Growth+) without paying for commercial/HOA tools',
		],
		competitorStrengths: [
			'AI-powered maintenance routing and leasing assistant',
			'Multi-property-type support (commercial, student, senior living)',
			'Full double-entry accounting with owner statements',
			'Built-in listing syndication and marketing tools',
			'Enterprise-scale infrastructure with 8.7M units managed',
		],
	},
	rentredi: {
		name: 'RentRedi',
		slug: 'rentredi',
		blogSlug: 'tenantflow-vs-rentredi-comparison',
		tagline: 'TenantFlow vs RentRedi: More Features, Fair Price',
		description:
			'RentRedi is cheap but basic. TenantFlow adds advanced reporting, visual workflows, and lease management for just $20 more per month.',
		metaDescription:
			'Compare TenantFlow vs RentRedi for landlords. RentRedi starts at $9/mo with basics. TenantFlow at $29/mo adds analytics, workflows, and more.',
		heroSubtitle:
			'RentRedi starts at $9/month with unlimited units and basic features. TenantFlow starts at $29/month with advanced analytics, visual workflows, and a more complete feature set.',
		capterra: '4.5/5 (104 reviews)',
		g2: '--',
		founded: '2016',
		bestFor: 'Budget-conscious DIY owners who want mobile-first management',
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{
				name: 'Monthly',
				price: '$19.95/mo',
				note: 'All features, unlimited units',
			},
			{
				name: 'Biannual',
				price: '$15/mo',
				note: 'All features, unlimited units',
			},
			{
				name: 'Annual',
				price: '$9/mo',
				note: 'All features, unlimited units',
			},
		],
		features: [
			{
				name: 'Document Vault',
				tenantflow: 'yes',
				tenantflowNote: 'Per-entity, global search',
				competitor: 'partial',
				competitorNote: 'Limited storage',
			},
			{
				name: 'Maintenance Records',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
				competitorNote: 'Basic tracking',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				tenantflowNote: 'Lease e-sign (Growth+)',
				competitor: 'partial',
				competitorNote: 'Templates + e-signing',
			},
			{
				name: 'Tenant Records',
				tenantflow: 'yes',
				tenantflowNote: 'Organized by unit',
				competitor: 'yes',
				competitorNote: 'Mobile app focused',
			},
			{
				name: 'Background Checks',
				tenantflow: 'no',
				tenantflowNote: 'Use a third-party service',
				competitor: 'yes',
			},
			{
				name: 'ACH / Payment Processing',
				tenantflow: 'no',
				tenantflowNote: 'Landlord-only platform',
				competitor: 'yes',
			},
			{
				name: 'Property Performance Reports',
				tenantflow: 'yes',
				competitor: 'no',
			},
			{
				name: 'Team Collaboration',
				tenantflow: 'yes',
				tenantflowNote: '3 users on Growth',
				competitor: 'yes',
				competitorNote: 'Unlimited team members',
			},
			{
				name: 'Unlimited Units',
				tenantflow: 'no',
				tenantflowNote: '25-100 by plan',
				competitor: 'yes',
				competitorNote: 'All plans',
			},
			{
				name: 'Native Mobile App',
				tenantflow: 'no',
				tenantflowNote: 'Responsive web app',
				competitor: 'yes',
				competitorNote: 'iOS + Android apps',
			},
		],
		whySwitch: [
			'Per-entity document vault with global search across leases, receipts, and inspections',
			'Visual kanban maintenance workflow vs basic request tracking',
			'Lease management with Lease e-sign (Growth+)',
			'Modern web interface built on Next.js + React 19',
			'Document storage up to 50GB on Growth plan',
		],
		competitorStrengths: [
			'Lowest price in the market at $9/month (annual)',
			'Unlimited units on all plans regardless of price',
			'Native mobile app for iOS and Android',
			'Unlimited team members included',
			'Simple, no-frills approach that covers the basics well',
		],
	},
}

export const VALID_COMPETITORS = Object.keys(COMPETITORS)
