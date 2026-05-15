/**
 * Simple pricing configuration for TenantFlow subscription system
 */

// Simple types
export type StripePriceId = `price_${string}`;
export type PlanId = "trial" | "starter" | "growth" | "max";

/**
 * Single source of truth for the Max plan's displayed price. Rendered in the
 * pricing comparison table (`pricing-comparison-table.tsx`). Other surfaces
 * (`page.tsx` metadata description + JSON-LD product) hardcode the same number
 * because they are static strings, not React renders.
 *
 * Originally introduced as the Phase 1 (CRIT-03) "Custom" placeholder when the
 * Max tier had no published price. Phase 5 set the live value to $149 and
 * removed all "Custom pricing, contact sales" strings.
 */
export const MAX_PUBLIC_PRICE_DISPLAY = "$149" as const;

// Trial configuration interface
export interface TrialConfig {
	readonly trialPeriodDays?: number;
	readonly collectPaymentMethod?: boolean;
	readonly trialEndBehavior?: "cancel" | "pause" | "require_payment";
}

// Main pricing configuration interface
export interface PricingConfig {
	readonly id: string;
	readonly planId: PlanId;
	readonly name: string;
	readonly description: string;
	readonly price: {
		readonly monthly: number;
		readonly annual: number;
	};
	readonly stripePriceIds: {
		readonly monthly: StripePriceId | null;
		readonly annual: StripePriceId | null;
	};
	readonly limits: {
		readonly properties: number;
		readonly units: number;
		readonly users: number;
		readonly storage: number;
		readonly apiCalls: number;
	};
	readonly features: readonly string[];
	readonly support: string;
	readonly trial: boolean | TrialConfig;
}

// Simple pricing plans configuration - Updated with correct Stripe data
export const PRICING_PLANS: Record<string, PricingConfig> = {
	FREETRIAL: {
		id: "FREETRIAL",
		planId: "trial",
		name: "Free Trial",
		description: "Try every feature for 14 days before subscribing",
		price: {
			monthly: 0,
			annual: 0,
		},
		stripePriceIds: {
			monthly: "price_1RgguDP3WCR53Sdo1lJmjlD5" as StripePriceId,
			annual: null,
		},
		limits: {
			properties: 1,
			units: 5,
			users: 1,
			storage: 1,
			apiCalls: 1000,
		},
		features: [
			"1 property",
			"Up to 5 units",
			"Basic maintenance tracking",
			"Tenant records",
			"1GB document storage",
			"Email support",
			"14-day trial period",
		],
		support: "Email",
		trial: {
			trialPeriodDays: 14,
			collectPaymentMethod: false,
			trialEndBehavior: "cancel",
		},
	},
	STARTER: {
		id: "STARTER",
		planId: "starter",
		name: "Starter",
		description: "Ideal for landlords with 1–5 rentals",
		price: {
			monthly: 19,
			annual: 190,
		},
		stripePriceIds: {
			monthly: "price_1TVTaAP3WCR53SdoYMUZN7Vf" as StripePriceId,
			annual: "price_1TVTaEP3WCR53Sdo7pbg6BCW" as StripePriceId,
		},
		limits: {
			properties: 5,
			units: 25,
			users: 1,
			storage: 10,
			apiCalls: 10000,
		},
		features: [
			"Up to 5 properties",
			"Up to 25 units",
			"Unlimited tenant records",
			"Document vault with global search",
			"Maintenance tracking",
			"Lease templates (e-sign on Growth and Max)",
			"10GB document storage",
			"Priority email support",
		],
		support: "Priority Email",
		trial: false,
	},
	GROWTH: {
		id: "GROWTH",
		planId: "growth",
		name: "Growth",
		description: "For growing portfolios that need advanced features",
		price: {
			monthly: 49,
			annual: 490,
		},
		stripePriceIds: {
			monthly: "price_1TVTaIP3WCR53SdoqnUe1Inv" as StripePriceId,
			annual: "price_1TVTaMP3WCR53SdoN4kufrVn" as StripePriceId,
		},
		limits: {
			properties: 20,
			units: 100,
			users: 3,
			storage: 50,
			apiCalls: 50000,
		},
		features: [
			"Up to 20 properties",
			"Up to 100 units",
			"Document vault with global search",
			"25 lease e-signs per month (DocuSeal)",
			"Renewal reminders",
			"Advanced financial reporting",
			"50GB document storage",
			"Team (3 users)",
			"Phone and priority email support",
		],
		support: "Phone & Email",
		trial: false,
	},
	TENANTFLOW_MAX: {
		id: "TENANTFLOW_MAX",
		planId: "max",
		name: "Max",
		description:
			"For landlords with 21+ rentals — unlimited scale and API access",
		price: {
			monthly: 149,
			annual: 1490,
		},
		stripePriceIds: {
			monthly: "price_1TVTaQP3WCR53Sdo22VAYfhp" as StripePriceId,
			annual: "price_1TVTaUP3WCR53Sdo5mnmSAmF" as StripePriceId,
		},
		limits: {
			properties: -1,
			units: -1,
			users: -1,
			storage: -1,
			apiCalls: -1,
		},
		features: [
			"Unlimited properties",
			"Unlimited units",
			"Document vault with global search",
			"Unlimited lease e-signs (DocuSeal)",
			"Custom lease clauses",
			"API access",
			"Dedicated account manager",
			"Unlimited storage",
			"Priority support during US business hours",
		],
		support: "Dedicated account manager",
		trial: false,
	},
};

export function getPricingPlan(planId: PlanId): PricingConfig | undefined {
	return Object.values(PRICING_PLANS).find((plan) => plan.planId === planId);
}

export function getAllPricingPlans(): PricingConfig[] {
	return Object.values(PRICING_PLANS);
}

export interface UsageMetrics {
	properties: number;
	units: number;
	users: number;
	storage: number;
	apiCalls: number;
}

export function checkPlanLimits(
	usage: UsageMetrics,
	planId: PlanId,
): { exceeded: boolean; limits: string[] } {
	const plan = getPricingPlan(planId);
	if (!plan) {
		return { exceeded: false, limits: [] };
	}

	const limits: string[] = [];
	let exceeded = false;

	if (plan.limits.properties > 0 && usage.properties > plan.limits.properties) {
		limits.push(`Properties: ${usage.properties}/${plan.limits.properties}`);
		exceeded = true;
	}
	if (plan.limits.units > 0 && usage.units > plan.limits.units) {
		limits.push(`Units: ${usage.units}/${plan.limits.units}`);
		exceeded = true;
	}
	if (plan.limits.users > 0 && usage.users > plan.limits.users) {
		limits.push(`Users: ${usage.users}/${plan.limits.users}`);
		exceeded = true;
	}
	if (plan.limits.storage > 0 && usage.storage > plan.limits.storage) {
		limits.push(`Storage: ${usage.storage}GB/${plan.limits.storage}GB`);
		exceeded = true;
	}
	if (plan.limits.apiCalls > 0 && usage.apiCalls > plan.limits.apiCalls) {
		limits.push(`API Calls: ${usage.apiCalls}/${plan.limits.apiCalls}`);
		exceeded = true;
	}

	return { exceeded, limits };
}

export function getRecommendedUpgrade(
	usage: UsageMetrics,
	currentPlanId: PlanId,
): PlanId | null {
	const plans: PlanId[] = ["trial", "starter", "growth", "max"];
	const currentIndex = plans.indexOf(currentPlanId);

	for (let i = currentIndex + 1; i < plans.length; i++) {
		const planId = plans[i];
		if (!planId) continue;

		const plan = getPricingPlan(planId);
		if (!plan) continue;

		const { exceeded } = checkPlanLimits(usage, planId);
		if (!exceeded) {
			return planId;
		}
	}

	return "max";
}

export function calculateAnnualSavings(monthlyPrice: number): number {
	const yearlyPrice = monthlyPrice * 10; // annual plans get 2 months free
	const monthlyCost = monthlyPrice * 12;
	return monthlyCost - yearlyPrice;
}

export function getTrialConfig(config: PricingConfig): TrialConfig | null {
	if (typeof config.trial === "boolean") {
		return config.trial
			? {
					trialPeriodDays: 14,
					collectPaymentMethod: false,
					trialEndBehavior: "cancel",
				}
			: null;
	}
	return config.trial;
}

export function hasTrial(config: PricingConfig): boolean {
	return typeof config.trial === "boolean" ? config.trial : true;
}

export function getStripePriceId(
	planId: PlanId,
	period: "monthly" | "annual",
): StripePriceId | null {
	const plan = getPricingPlan(planId);
	if (!plan) return null;

	return period === "monthly"
		? plan.stripePriceIds.monthly
		: plan.stripePriceIds.annual;
}
