/**
 * TenantFlow Pricing Plans Configuration
 * This file provides backwards compatibility for legacy code
 * Actual pricing configuration is in config/pricing.ts with PRODUCT_TIERS
 */
import { PRODUCT_TIERS } from '../config/pricing';
import { PLAN_TYPE } from '../types/billing';
// Convert PRODUCT_TIERS to array for legacy compatibility
export const PRICING_PLANS = [
    PRODUCT_TIERS[PLAN_TYPE.FREETRIAL],
    PRODUCT_TIERS[PLAN_TYPE.STARTER],
    PRODUCT_TIERS[PLAN_TYPE.GROWTH],
    PRODUCT_TIERS[PLAN_TYPE.TENANTFLOW_MAX],
].filter((tier) => tier !== undefined);
// Helper functions
export const getPlanById = (planId) => {
    return PRODUCT_TIERS[planId];
};
export const getRecommendedPlan = () => {
    const tier = PRODUCT_TIERS[PLAN_TYPE.GROWTH];
    if (!tier) {
        throw new Error('Growth plan configuration not found');
    }
    return tier;
};
export const getStarterPlan = () => {
    const tier = PRODUCT_TIERS[PLAN_TYPE.STARTER];
    if (!tier) {
        throw new Error('Starter plan configuration not found');
    }
    return tier;
};
export const getPaidPlans = () => {
    return PRICING_PLANS.filter(plan => plan.price.monthly > 0);
};
// Validation
export const validatePricingPlans = () => {
    return PRICING_PLANS.every(plan => {
        return !!(plan.id &&
            plan.name &&
            plan.description &&
            typeof plan.price.monthly === 'number' &&
            typeof plan.price.annual === 'number' &&
            Array.isArray(plan.features) &&
            plan.features.length > 0);
    });
};
// Export plan IDs as constants for backwards compatibility
export const PLAN_IDS = {
    STARTER: PLAN_TYPE.STARTER,
    GROWTH: PLAN_TYPE.GROWTH,
    BUSINESS: PLAN_TYPE.GROWTH, // Map legacy BUSINESS to GROWTH
    TENANTFLOW_MAX: PLAN_TYPE.TENANTFLOW_MAX,
};
//# sourceMappingURL=pricing-plans.js.map