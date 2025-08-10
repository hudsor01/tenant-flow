/**
 * TenantFlow Pricing Plans Configuration
 * This file provides backwards compatibility for legacy code
 * Actual pricing configuration is in config/pricing.ts with PRODUCT_TIERS
 */
import type { ProductTierConfig } from '../types/billing';
export declare const PRICING_PLANS: ProductTierConfig[];
export declare const getPlanById: (planId: string) => ProductTierConfig | undefined;
export declare const getRecommendedPlan: () => ProductTierConfig;
export declare const getStarterPlan: () => ProductTierConfig;
export declare const getPaidPlans: () => ProductTierConfig[];
export declare const validatePricingPlans: () => boolean;
export declare const PLAN_IDS: {
    readonly STARTER: "STARTER";
    readonly GROWTH: "GROWTH";
    readonly BUSINESS: "GROWTH";
    readonly TENANTFLOW_MAX: "TENANTFLOW_MAX";
};
export type PlanId = typeof PLAN_IDS[keyof typeof PLAN_IDS];
//# sourceMappingURL=pricing-plans.d.ts.map