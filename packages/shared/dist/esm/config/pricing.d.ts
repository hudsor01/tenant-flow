/**
 * Pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier
 */
import type { PlanType } from '../types/stripe';
import type { ProductTierConfig, TrialConfig } from '../types/billing';
/**
 * Production-ready pricing configuration for TenantFlow
 * 4 Products: Free Trial, Starter, Growth, TenantFlow Max
 */
export declare const PRODUCT_TIERS: Record<PlanType, ProductTierConfig>;
/**
 * Get product tier configuration by plan type
 */
export declare function getProductTier(planType: PlanType): ProductTierConfig;
/**
 * Get Stripe price ID for a plan and billing interval
 */
export declare function getStripePriceId(planType: PlanType, interval: 'monthly' | 'annual'): string | null;
/**
 * Check if a plan has a free trial
 */
export declare function hasTrial(planType: PlanType): boolean;
/**
 * Get trial configuration for a plan
 */
export declare function getTrialConfig(planType: PlanType): TrialConfig | undefined;
/**
 * Check if user has exceeded plan limits
 */
export declare function checkPlanLimits(planType: PlanType, usage: {
    properties?: number;
    units?: number;
    users?: number;
    storage?: number;
    apiCalls?: number;
}): {
    exceeded: boolean;
    limits: {
        type: string;
        current: number;
        limit: number;
    }[];
};
/**
 * Get recommended upgrade plan based on usage
 */
export declare function getRecommendedUpgrade(currentPlan: PlanType, usage: {
    properties?: number;
    units?: number;
    users?: number;
}): PlanType | null;
/**
 * Calculate annual savings for a plan
 */
export declare function calculateAnnualSavings(planType: PlanType): number;
//# sourceMappingURL=pricing.d.ts.map