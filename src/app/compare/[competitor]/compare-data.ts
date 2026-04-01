import type { CompetitorData, PricingTier } from '#types/sections/compare'

const TENANTFLOW_PRICING: PricingTier[] = [
	{ name: 'Starter', price: '$29/mo', note: 'Up to 5 properties, 25 units' },
	{ name: 'Growth', price: '$79/mo', note: 'Up to 20 properties, 100 units' },
	{
		name: 'TenantFlow Max',
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
				name: 'Online Rent Collection',
				tenantflow: 'yes',
				competitor: 'yes',
			},
			{
				name: 'Maintenance Management',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				tenantflowNote: 'DocuSeal e-signing',
				competitor: 'yes',
			},
			{ name: 'Tenant Portal', tenantflow: 'yes', competitor: 'yes' },
			{ name: 'Tenant Screening', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Financial Reporting',
				tenantflow: 'yes',
				competitor: 'yes',
				competitorNote: 'More mature accounting',
			},
			{ name: 'Document Storage', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Automated Workflows',
				tenantflow: 'yes',
				competitor: 'partial',
				competitorNote: 'Higher tiers only',
			},
			{
				name: 'HOA Management',
				tenantflow: 'no',
				competitor: 'yes',
				competitorNote: 'Violation tracking included',
			},
			{
				name: 'Real-Time Updates',
				tenantflow: 'yes',
				tenantflowNote: 'Built-in',
				competitor: 'no',
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
			'All core features included on every plan -- no upsell tiers for basics',
			'14-day free trial with no credit card required',
			'Automated rent collection, late fees, and lease reminders included',
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
		tagline: 'The AppFolio Alternative for Small Landlords',
		description:
			'AppFolio requires 50+ units and $298/month minimum. TenantFlow starts at $29/month with no minimums. Compare features and pricing.',
		metaDescription:
			'AppFolio alternative for landlords with fewer than 50 units. TenantFlow starts at $29/mo vs AppFolio\'s $298/mo minimum. No unit requirements.',
		heroSubtitle:
			'AppFolio requires a minimum of 50 units and $298/month. TenantFlow has no minimums and starts at $29/month -- professional tools for any portfolio size.',
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
				name: 'Online Rent Collection',
				tenantflow: 'yes',
				competitor: 'yes',
			},
			{
				name: 'Maintenance Management',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
				competitorNote: 'AI-powered routing',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				competitor: 'yes',
				competitorNote: 'AI leasing assistant',
			},
			{ name: 'Tenant Portal', tenantflow: 'yes', competitor: 'yes' },
			{ name: 'Tenant Screening', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Financial Reporting',
				tenantflow: 'yes',
				competitor: 'yes',
				competitorNote: 'Full double-entry accounting',
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
			'No unit minimums -- manage 1 unit or 100 without restrictions',
			'Save over $2,600/year at 30 units ($79/mo vs $298/mo minimum)',
			'Transparent pricing -- no custom quotes or sales calls needed',
			'14-day free trial to test everything before committing',
			'All residential property management features you need, without paying for commercial/HOA tools',
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
			'Compare TenantFlow vs RentRedi for small landlords. RentRedi starts at $9/mo with basics. TenantFlow at $29/mo adds analytics, workflows, and more.',
		heroSubtitle:
			'RentRedi starts at $9/month with unlimited units and basic features. TenantFlow starts at $29/month with advanced analytics, visual workflows, and a more complete feature set.',
		capterra: '4.5/5 (104 reviews)',
		g2: '--',
		founded: '2016',
		bestFor: 'Budget-conscious DIY landlords who want mobile-first management',
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
				name: 'Online Rent Collection',
				tenantflow: 'yes',
				competitor: 'yes',
			},
			{
				name: 'Maintenance Management',
				tenantflow: 'yes',
				tenantflowNote: 'Kanban workflow board',
				competitor: 'yes',
				competitorNote: 'Basic tracking',
			},
			{
				name: 'Lease Management',
				tenantflow: 'yes',
				tenantflowNote: 'DocuSeal e-signing + auto reminders',
				competitor: 'partial',
				competitorNote: 'Templates + e-signing',
			},
			{
				name: 'Tenant Portal',
				tenantflow: 'yes',
				tenantflowNote: 'Real-time updates',
				competitor: 'yes',
				competitorNote: 'Mobile app focused',
			},
			{ name: 'Tenant Screening', tenantflow: 'yes', competitor: 'yes' },
			{
				name: 'Advanced Analytics',
				tenantflow: 'yes',
				tenantflowNote: 'Revenue trends, occupancy, KPIs',
				competitor: 'no',
				competitorNote: 'Basic income/expense only',
			},
			{
				name: 'Property Performance Reports',
				tenantflow: 'yes',
				competitor: 'no',
			},
			{
				name: 'Document Storage',
				tenantflow: 'yes',
				tenantflowNote: 'Up to 50GB on Growth',
				competitor: 'partial',
				competitorNote: 'Limited storage',
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
				competitorNote: 'Best-in-class mobile app',
			},
			{
				name: 'Automated Workflows',
				tenantflow: 'yes',
				tenantflowNote: 'Late fees, reminders, renewals',
				competitor: 'partial',
				competitorNote: 'Late fees + reminders',
			},
		],
		whySwitch: [
			'Advanced analytics and property performance reporting included',
			'Visual kanban maintenance workflow vs basic request tracking',
			'Full lease management with auto renewal reminders and e-signing',
			'Modern web interface with real-time data updates',
			'Document storage up to 50GB on Growth plan',
		],
		competitorStrengths: [
			'Lowest price in the market at $9/month (annual)',
			'Unlimited units on all plans regardless of price',
			'Best-in-class native mobile app for iOS and Android',
			'Unlimited team members included',
			'Simple, no-frills approach that covers the basics well',
		],
	},
}

export const VALID_COMPETITORS = Object.keys(COMPETITORS)
