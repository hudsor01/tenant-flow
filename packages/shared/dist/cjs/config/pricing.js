"use strict";
/**
 * Enhanced type-safe pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier with branded types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_TIERS = exports.ENHANCED_PRODUCT_TIERS = void 0;
exports.getProductTier = getProductTier;
exports.getStripePriceId = getStripePriceId;
exports.getEnhancedProductTier = getEnhancedProductTier;
exports.hasTrial = hasTrial;
exports.getTrialConfig = getTrialConfig;
exports.checkPlanLimits = checkPlanLimits;
exports.getRecommendedUpgrade = getRecommendedUpgrade;
exports.calculateAnnualSavings = calculateAnnualSavings;
/**
 * Production-ready enhanced pricing configuration for TenantFlow
 * 4 Products: Free Trial, Starter, Growth, TenantFlow Max
 * Immutable configuration with branded types for type safety
 */
exports.ENHANCED_PRODUCT_TIERS = {
    FREETRIAL: {
        id: 'FREETRIAL',
        planId: 'trial',
        name: 'Free Trial',
        description: 'Perfect for trying out TenantFlow',
        price: {
            monthly: 0,
            annual: 0
        },
        stripePriceIds: {
            monthly: 'price_1RtWFcP3WCR53Sdo5Li5xHiC',
            annual: null
        },
        limits: {
            properties: 1,
            units: 5,
            users: 1,
            storage: 1,
            apiCalls: 1000
        },
        features: [
            'Up to 1 property',
            'Up to 5 units',
            'Basic tenant management',
            'Email support',
            'Mobile app access'
        ],
        support: 'email',
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'cancel',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        }
    },
    STARTER: {
        id: 'STARTER',
        planId: 'starter',
        name: 'Starter',
        description: 'Great for small property managers',
        price: {
            monthly: 29,
            annual: 290
        },
        stripePriceIds: {
            monthly: 'price_1RtWFcP3WCR53SdoCxiVldhb',
            annual: 'price_1RtWFdP3WCR53SdoArRRXYrL'
        },
        limits: {
            properties: 5,
            units: 50,
            users: 3,
            storage: 10,
            apiCalls: 10000
        },
        features: [
            'Up to 5 properties',
            'Up to 50 units',
            'Advanced tenant management',
            'Lease management',
            'Maintenance tracking',
            'Financial reporting',
            'Priority email support',
            'API access'
        ],
        support: 'email',
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        popular: true
    },
    GROWTH: {
        id: 'GROWTH',
        planId: 'growth',
        name: 'Growth',
        description: 'Ideal for growing property management companies',
        price: {
            monthly: 79,
            annual: 790
        },
        stripePriceIds: {
            monthly: 'price_1RtWFdP3WCR53Sdoz98FFpSu',
            annual: 'price_1RtWFdP3WCR53SdoHDRR9kAJ'
        },
        limits: {
            properties: 20,
            units: 200,
            users: 10,
            storage: 50,
            apiCalls: 50000
        },
        features: [
            'Up to 20 properties',
            'Up to 200 units',
            'Everything in Starter',
            'Advanced analytics',
            'Custom reports',
            'Bulk operations',
            'Team collaboration',
            'Priority support',
            'Advanced API access',
            'Integrations'
        ],
        support: 'priority',
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        recommended: true
    },
    TENANTFLOW_MAX: {
        id: 'TENANTFLOW_MAX',
        planId: 'max',
        name: 'TenantFlow Max',
        description: 'For large property management operations',
        price: {
            monthly: 199,
            annual: 1990
        },
        stripePriceIds: {
            monthly: 'price_1RtWFeP3WCR53Sdo9AsL7oGv',
            annual: 'price_1RtWFeP3WCR53Sdoxm2iY4mt'
        },
        limits: {
            properties: -1,
            units: -1,
            users: -1,
            storage: -1,
            apiCalls: -1
        },
        features: [
            'Unlimited properties',
            'Unlimited units',
            'Everything in Growth',
            'White-label options',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantee',
            '24/7 phone support',
            'Custom training',
            'API rate limit bypass'
        ],
        support: 'dedicated',
        trial: {
            trialPeriodDays: 30,
            trialEndBehavior: 'pause',
            collectPaymentMethod: true,
            reminderDaysBeforeEnd: 7
        }
    }
};
// Legacy support - maps to enhanced config
exports.PRODUCT_TIERS = {
    FREETRIAL: exports.ENHANCED_PRODUCT_TIERS.FREETRIAL,
    STARTER: exports.ENHANCED_PRODUCT_TIERS.STARTER,
    GROWTH: exports.ENHANCED_PRODUCT_TIERS.GROWTH,
    TENANTFLOW_MAX: exports.ENHANCED_PRODUCT_TIERS.TENANTFLOW_MAX
};
/**
 * Get product tier configuration by plan type
 */
function getProductTier(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    if (!tier) {
        throw new Error(`Product tier not found for plan type: ${planType}`);
    }
    return tier;
}
/**
 * Enhanced type-safe functions for pricing operations
 */
/**
 * Get Stripe price ID for a plan and billing interval with type safety
 */
function getStripePriceId(planType, interval) {
    const tier = exports.ENHANCED_PRODUCT_TIERS[planType];
    if (!tier)
        return null;
    return tier.stripePriceIds[interval];
}
/**
 * Get enhanced product tier configuration by plan type
 */
function getEnhancedProductTier(planType) {
    const tier = exports.ENHANCED_PRODUCT_TIERS[planType];
    if (!tier) {
        throw new Error(`Enhanced product tier not found for plan type: ${planType}`);
    }
    return tier;
}
/**
 * Check if a plan has a free trial
 */
function hasTrial(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    if (!tier)
        return false;
    return tier.trial.trialPeriodDays > 0;
}
/**
 * Get trial configuration for a plan
 */
function getTrialConfig(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    return tier?.trial;
}
/**
 * Enhanced plan limit checking with type safety
 */
function checkPlanLimits(planType, usage) {
    const tier = exports.PRODUCT_TIERS[planType];
    const exceededLimits = [];
    const warningLimits = [];
    if (!tier) {
        return {
            exceeded: false,
            limits: [],
            warningLimits: []
        };
    }
    // Helper function to calculate utilization and check limits
    const checkLimit = (type, current, limit) => {
        if (!current || !limit || limit === -1)
            return;
        const utilizationPercent = Math.round((current / limit) * 100);
        if (current > limit) {
            exceededLimits.push({
                type,
                current,
                limit,
                utilizationPercent
            });
        }
        else if (utilizationPercent >= 80) {
            // Warning when usage is 80% or higher
            warningLimits.push({
                type,
                current,
                limit,
                utilizationPercent
            });
        }
    };
    // Check all limits
    checkLimit('properties', usage.properties, tier.limits.properties);
    checkLimit('units', usage.units, tier.limits.units);
    checkLimit('users', usage.users, tier.limits.users);
    checkLimit('storage', usage.storage, tier.limits.storage);
    checkLimit('apiCalls', usage.apiCalls, tier.limits.apiCalls);
    return {
        exceeded: exceededLimits.length > 0,
        limits: exceededLimits,
        warningLimits
    };
}
/**
 * Get recommended upgrade plan based on usage
 */
function getRecommendedUpgrade(currentPlan, usage) {
    const planOrder = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX'];
    const currentIndex = planOrder.indexOf(currentPlan);
    // Check each plan in order to find the first one that fits usage
    for (let i = currentIndex + 1; i < planOrder.length; i++) {
        const plan = planOrder[i];
        if (!plan)
            continue; // Skip if plan is undefined
        const tier = exports.PRODUCT_TIERS[plan];
        if (!tier)
            continue; // Skip if tier is undefined
        const fitsUsage = (tier.limits.properties === -1 || tier.limits.properties === undefined || !usage.properties || usage.properties <= tier.limits.properties) &&
            (tier.limits.units === -1 || tier.limits.units === undefined || !usage.units || usage.units <= tier.limits.units) &&
            (tier.limits.users === -1 || tier.limits.users === undefined || !usage.users || usage.users <= tier.limits.users);
        if (fitsUsage) {
            return plan;
        }
    }
    return null;
}
/**
 * Calculate annual savings for a plan
 */
function calculateAnnualSavings(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    const monthlyCost = tier.price.monthly * 12;
    const annualCost = tier.price.annual;
    return monthlyCost - annualCost;
}
//# sourceMappingURL=pricing.js.map