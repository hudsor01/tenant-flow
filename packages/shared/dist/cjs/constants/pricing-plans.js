"use strict";
/**
 * TenantFlow Pricing Plans Configuration
 * This file provides backwards compatibility for legacy code
 * Actual pricing configuration is in config/pricing.ts with PRODUCT_TIERS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_IDS = exports.validatePricingPlans = exports.getPaidPlans = exports.getStarterPlan = exports.getRecommendedPlan = exports.getPlanById = exports.PRICING_PLANS = void 0;
const pricing_1 = require("../config/pricing");
const billing_1 = require("../types/billing");
// Convert PRODUCT_TIERS to array for legacy compatibility
exports.PRICING_PLANS = [
    pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.FREETRIAL],
    pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.STARTER],
    pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.GROWTH],
    pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.TENANTFLOW_MAX],
].filter((tier) => tier !== undefined);
// Helper functions
const getPlanById = (planId) => {
    return pricing_1.PRODUCT_TIERS[planId];
};
exports.getPlanById = getPlanById;
const getRecommendedPlan = () => {
    const tier = pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.GROWTH];
    if (!tier) {
        throw new Error('Growth plan configuration not found');
    }
    return tier;
};
exports.getRecommendedPlan = getRecommendedPlan;
const getStarterPlan = () => {
    const tier = pricing_1.PRODUCT_TIERS[billing_1.PLAN_TYPE.STARTER];
    if (!tier) {
        throw new Error('Starter plan configuration not found');
    }
    return tier;
};
exports.getStarterPlan = getStarterPlan;
const getPaidPlans = () => {
    return exports.PRICING_PLANS.filter(plan => plan.price.monthly > 0);
};
exports.getPaidPlans = getPaidPlans;
// Validation
const validatePricingPlans = () => {
    return exports.PRICING_PLANS.every(plan => {
        return !!(plan.id &&
            plan.name &&
            plan.description &&
            typeof plan.price.monthly === 'number' &&
            typeof plan.price.annual === 'number' &&
            Array.isArray(plan.features) &&
            plan.features.length > 0);
    });
};
exports.validatePricingPlans = validatePricingPlans;
// Export plan IDs as constants for backwards compatibility
exports.PLAN_IDS = {
    STARTER: billing_1.PLAN_TYPE.STARTER,
    GROWTH: billing_1.PLAN_TYPE.GROWTH,
    BUSINESS: billing_1.PLAN_TYPE.GROWTH, // Map legacy BUSINESS to GROWTH
    TENANTFLOW_MAX: billing_1.PLAN_TYPE.TENANTFLOW_MAX,
};
//# sourceMappingURL=pricing-plans.js.map