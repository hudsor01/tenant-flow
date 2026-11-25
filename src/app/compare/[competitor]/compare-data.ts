import {
	getPricingPlan,
	type PlanId,
	type PricingConfig,
} from "#config/pricing";
import { DiagnosticError } from "#lib/diagnostic-error";
import { formatCount } from "#lib/formatters/count";
import { formatPrice } from "#lib/utils/currency";
import type { CompetitorData, PricingTier } from "#types/sections/compare";

// Competitor prices, ratings and figures are read by hand from each vendor's
// own pricing page and from their Capterra and G2 listings, then dated in
// `checkedAt`; the pages print "as of <Month YYYY>" from it. Last read
// 2026-11-24. `compare-data-freshness.test.ts` fails once a `checkedAt` is
// more than 180 days old, so a stale price can't sit on the site unnoticed.
// TenantFlow's own prices and limits come from `src/config/pricing.ts`.

function plan(id: PlanId): PricingConfig {
	const config = getPricingPlan(id);
	if (!config)
		throw new DiagnosticError(`compare-data: no "${id}" plan in pricing.ts`);
	return config;
}

const STARTER = plan("starter");
const GROWTH = plan("growth");
const MAX = plan("max");

function limitsNote(config: PricingConfig): string {
	return config.limits.properties === -1
		? "Unlimited properties and units"
		: `Up to ${formatCount(config.limits.properties, "property", "properties")}, ${formatCount(config.limits.units, "unit")}`;
}

const TENANTFLOW_PRICING: PricingTier[] = [STARTER, GROWTH, MAX].map(
	(config) => ({
		name: config.name,
		price: formatPrice(config.price.monthly, { interval: "month" }),
		note: limitsNote(config),
	}),
);

/** "$1,800" for 1836: the yearly difference, rounded down to the hundred. */
function savedPerYear(theirMonthly: number, ourMonthly: number): string {
	const floored = Math.floor(((theirMonthly - ourMonthly) * 12) / 100) * 100;
	return formatPrice(floored);
}

// buildium.com/pricing, monthly billing, "starting at".
const BUILDIUM = { essential: 65, growth: 202, premium: 420 } as const;

const NO_RENT_PROCESSING =
	"Not offered: TenantFlow doesn't handle rent payments";

export const COMPETITORS: Record<string, CompetitorData> = {
	buildium: {
		name: "Buildium",
		slug: "buildium",
		tagline: "A Buildium alternative for independent landlords",
		description: `Buildium is built for property managers, with accounting and a resident portal. TenantFlow is landlord-only, from ${formatPrice(STARTER.price.monthly)}/month.`,
		metaDescription: `Looking for a Buildium alternative? TenantFlow starts at ${formatPrice(STARTER.price.monthly, { interval: "month" })} vs Buildium's ${formatPrice(BUILDIUM.essential, { interval: "month" })}, covering the core landlord features. Compare pricing and features.`,
		heroSubtitle: `Buildium starts at ${formatPrice(BUILDIUM.essential)}/month. TenantFlow starts at ${formatPrice(STARTER.price.monthly)}/month for the core landlord tools, with no per-transaction fees.`,
		capterra: "4.5/5 (2,236 reviews)",
		g2: "4.4/5 (287 reviews)",
		checkedAt: "2026-11-24",
		pricingSource: "buildium.com/pricing",
		founded: "2004",
		bestFor: "Small to mid-sized property managers and HOA management",
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{
				name: "Essential",
				price: formatPrice(BUILDIUM.essential, { interval: "month" }),
				note: "Accounting, maintenance and leasing basics",
			},
			{
				name: "Growth",
				price: formatPrice(BUILDIUM.growth, { interval: "month" }),
				note: "Adds reporting automation and business analytics",
			},
			{
				name: "Premium",
				price: formatPrice(BUILDIUM.premium, { interval: "month" }),
				note: "Adds the Open API and the full AI suite",
			},
		],
		features: [
			{
				name: "Document Vault",
				tenantflow: "yes",
				tenantflowNote: "Per-entity, global search",
				competitor: "partial",
				competitorNote: "Basic file storage",
			},
			{
				name: "Maintenance Records",
				tenantflow: "yes",
				tenantflowNote: "Kanban workflow board",
				competitor: "yes",
			},
			{
				name: "Lease Management",
				tenantflow: "yes",
				tenantflowNote: "Lease e-sign (Growth+)",
				competitor: "yes",
			},
			{ name: "Tenant Records", tenantflow: "yes", competitor: "yes" },
			{
				name: "Financial Reporting",
				tenantflow: "yes",
				competitor: "yes",
				competitorNote: "More mature accounting",
			},
			{
				name: "Background Checks",
				tenantflow: "no",
				tenantflowNote: "Use a third-party service",
				competitor: "addon",
				competitorNote: "TransUnion add-on",
			},
			{
				name: "ACH / Payment Processing",
				tenantflow: "na",
				tenantflowNote: NO_RENT_PROCESSING,
				competitor: "addon",
				competitorNote: "Payments add-on",
			},
			{
				name: "HOA Management",
				tenantflow: "na",
				tenantflowNote: "Not applicable — landlord-only platform",
				competitor: "yes",
				competitorNote: "Violation tracking included",
			},
			{
				name: "Transparent Pricing",
				tenantflow: "yes",
				competitor: "partial",
				competitorNote: "Add-on costs",
			},
		],
		whySwitch: [
			`Save over ${savedPerYear(BUILDIUM.growth, GROWTH.price.monthly)}/year compared to Buildium Growth (${formatPrice(GROWTH.price.monthly, { interval: "month" })} vs ${formatPrice(BUILDIUM.growth, { interval: "month" })})`,
			"Landlord-only: tenants are records, never users, so there's no resident portal to run",
			"Per-entity document vault with global search included on every plan",
			"Flat plan prices with no per-unit pricing and no onboarding fee",
			"Built for independent landlords: leases, maintenance, documents and records, without property-manager accounting",
		],
		competitorStrengths: [
			"HOA and community association management features",
			"Mature full-service accounting with 1099 e-filing",
			"20 years of industry presence and extensive documentation",
			"Large integration ecosystem",
		],
	},
	appfolio: {
		name: "AppFolio",
		slug: "appfolio",
		tagline: "The AppFolio Alternative for Landlords",
		description: `AppFolio starts at $1.49 per unit per month, with a 50-unit minimum and a minimum spend. TenantFlow starts at ${formatPrice(STARTER.price.monthly)}/month with no unit minimum.`,
		metaDescription: `AppFolio needs 50+ units and a minimum spend. TenantFlow has no unit minimum and starts at ${formatPrice(STARTER.price.monthly, { interval: "month" })}, with a 14-day free trial.`,
		heroSubtitle: `AppFolio starts at $1.49 per unit per month, with a 50-unit minimum and a minimum spend. TenantFlow has no unit minimum and starts at ${formatPrice(STARTER.price.monthly)}/month.`,
		capterra: "4.5/5 (1,892 reviews)",
		g2: "4.6/5 (1,198 reviews)",
		checkedAt: "2026-11-24",
		pricingSource: "appfolio.com/pricing",
		founded: "2006",
		bestFor: "Property management companies with 50+ units",
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{
				name: "Core",
				price: "$1.49/unit/mo",
				note: "50-unit minimum and a minimum spend",
			},
			{
				name: "Plus",
				price: "$3.20/unit/mo",
				note: "Minimum spend and units apply",
			},
			{
				name: "Max",
				price: "$5.00/unit/mo",
				note: "Minimum spend and units apply",
			},
		],
		features: [
			{
				name: "Document Vault",
				tenantflow: "yes",
				tenantflowNote: "Per-entity, global search",
				competitor: "partial",
				competitorNote: "Basic file storage",
			},
			{
				name: "Maintenance Records",
				tenantflow: "yes",
				tenantflowNote: "Kanban workflow board",
				competitor: "yes",
				competitorNote: "AI-powered routing",
			},
			{
				name: "Lease Management",
				tenantflow: "yes",
				tenantflowNote: "Lease e-sign (Growth+)",
				competitor: "yes",
				competitorNote: "AI leasing assistant",
			},
			{ name: "Tenant Records", tenantflow: "yes", competitor: "yes" },
			{
				name: "Financial Reporting",
				tenantflow: "yes",
				competitor: "yes",
				competitorNote: "Full double-entry accounting",
			},
			{
				name: "Background Checks",
				tenantflow: "no",
				tenantflowNote: "Use a third-party service",
				competitor: "addon",
				competitorNote: "Screening add-on",
			},
			{
				name: "ACH / Payment Processing",
				tenantflow: "na",
				tenantflowNote: NO_RENT_PROCESSING,
				competitor: "addon",
				competitorNote: "Payments add-on",
			},
			{
				name: "Listing Syndication",
				tenantflow: "no",
				competitor: "yes",
				competitorNote: "Built-in marketing tools",
			},
			{
				name: "Commercial Properties",
				tenantflow: "no",
				competitor: "yes",
				competitorNote: "Multi-type support",
			},
			{
				name: "No Unit Minimums",
				tenantflow: "yes",
				tenantflowNote: "Start with 1 unit",
				competitor: "no",
				competitorNote: "50-unit minimum",
			},
			{
				name: "Transparent Pricing",
				tenantflow: "yes",
				competitor: "partial",
				competitorNote: "Per-unit starting prices; quote required",
			},
			{
				name: "Free Trial",
				tenantflow: "yes",
				tenantflowNote: "14-day, no credit card",
				competitor: "no",
				competitorNote: "Demo only",
			},
		],
		whySwitch: [
			`No unit minimum: start with 1 unit and grow to ${GROWTH.limits.units} on the Growth plan`,
			`AppFolio isn't available below 50 units. TenantFlow Growth covers up to ${formatCount(GROWTH.limits.properties, "property", "properties")} and ${formatCount(GROWTH.limits.units, "unit")} for ${formatPrice(GROWTH.price.monthly)}/month`,
			"Published flat prices: no quote or sales call needed",
			"14-day free trial, no credit card required, to try TenantFlow before committing",
			"Per-entity document vault and lease e-sign (Growth+) without paying for commercial/HOA tools",
		],
		competitorStrengths: [
			"AI-powered maintenance routing and leasing assistant",
			"Multi-property-type support (commercial, student, affordable housing)",
			"Full double-entry accounting with owner statements",
			"Built-in listing syndication and marketing tools",
			"Over 8 million units managed on the platform, by AppFolio's count",
		],
	},
	rentredi: {
		name: "RentRedi",
		slug: "rentredi",
		tagline: "Landlord-only records vs an all-in-one tenant app",
		description: `RentRedi is a low-cost all-in-one with a tenant app and built-in rent payments. TenantFlow is landlord-only, with no tenant accounts, from ${formatPrice(STARTER.price.monthly)}/month.`,
		metaDescription: `RentRedi is $12/mo (annual) with a tenant app and built-in rent payments. TenantFlow is landlord-only from ${formatPrice(STARTER.price.monthly, { interval: "month" })}, with a per-entity document vault.`,
		heroSubtitle: `RentRedi is an all-in-one from $12/month (billed annually) that includes a tenant app and rent payments. TenantFlow is landlord-only: your records, leases and documents in one vault, with no tenant accounts to manage. From ${formatPrice(STARTER.price.monthly)}/month.`,
		capterra: "4.5/5 (180 reviews)",
		g2: "4.4/5 (251 reviews)",
		checkedAt: "2026-11-24",
		pricingSource: "rentredi.com/pricing",
		founded: "2016",
		bestFor: "Budget-conscious DIY owners who want mobile-first management",
		tenantflowPricing: TENANTFLOW_PRICING,
		competitorPricing: [
			{
				name: "Monthly",
				price: "$29.95/mo",
				note: "All features, unlimited units",
			},
			{
				name: "6-month",
				price: "$20/mo",
				note: "All features, unlimited units",
			},
			{
				name: "Annual",
				price: "$12/mo",
				note: "All features, unlimited units",
			},
		],
		features: [
			{
				name: "Document Vault",
				tenantflow: "yes",
				tenantflowNote: "Per-entity, global search",
				competitor: "partial",
				competitorNote: "Leases, addenda and insurance",
			},
			{
				name: "Maintenance Records",
				tenantflow: "yes",
				tenantflowNote: "Kanban workflow board",
				competitor: "yes",
				competitorNote: "Photo and video requests",
			},
			{
				name: "Lease Management",
				tenantflow: "yes",
				tenantflowNote: "Lease e-sign (Growth+)",
				competitor: "yes",
				competitorNote: "Unlimited e-signatures, all plans",
			},
			{
				name: "Tenant Records",
				tenantflow: "yes",
				competitor: "yes",
				competitorNote: "Tenant app and portal",
			},
			{
				name: "Background Checks",
				tenantflow: "no",
				tenantflowNote: "Use a third-party service",
				competitor: "yes",
				competitorNote: "Credit, criminal, eviction (tenant-paid)",
			},
			{
				name: "ACH / Payment Processing",
				tenantflow: "na",
				tenantflowNote: NO_RENT_PROCESSING,
				competitor: "yes",
				competitorNote: "ACH, card or cash",
			},
			{
				name: "Team Collaboration",
				tenantflow: "no",
				tenantflowNote: "Single-owner accounts",
				competitor: "yes",
				competitorNote: "Unlimited team members",
			},
			{
				name: "Unlimited Units",
				tenantflow: "partial",
				tenantflowNote: `Unlimited on Max; ${STARTER.limits.units}/${GROWTH.limits.units} on Starter/Growth`,
				competitor: "yes",
				competitorNote: "All plans",
			},
			{
				name: "Native Mobile App",
				tenantflow: "no",
				tenantflowNote: "Responsive web app",
				competitor: "yes",
				competitorNote: "iOS + Android apps",
			},
			{
				name: "Try Before Paying",
				tenantflow: "yes",
				tenantflowNote: "14-day free trial, no card to start",
				competitor: "partial",
				competitorNote: "Charged at signup; 30-day refund window",
			},
		],
		whySwitch: [
			"Per-entity document vault with global search across leases, receipts, and inspections",
			"Visual kanban maintenance board",
			"Tenants never get logins, so there's no tenant support to handle",
			`Document storage up to ${GROWTH.limits.storage}GB on the Growth plan`,
		],
		competitorStrengths: [
			"Flat $12/month (annual) for unlimited units",
			"Unlimited units on all plans regardless of price",
			"Native mobile app for iOS and Android",
			"Unlimited team members included",
			"Unlimited e-signatures and accounting reports on every plan",
			"30-day refund window on every plan",
		],
	},
};

export const VALID_COMPETITORS = Object.keys(COMPETITORS);
