"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRODUCT_TIERS = void 0;
exports.getProductTier = getProductTier;
exports.getStripePriceId = getStripePriceId;
exports.hasTrial = hasTrial;
exports.getTrialConfig = getTrialConfig;
exports.checkPlanLimits = checkPlanLimits;
exports.getRecommendedUpgrade = getRecommendedUpgrade;
exports.calculateAnnualSavings = calculateAnnualSavings;
exports.PRODUCT_TIERS = {
    FREETRIAL: {
        id: 'FREETRIAL',
        name: 'Free Trial',
        description: 'Perfect for trying out TenantFlow',
        price: {
            monthly: 0,
            annual: 0
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'cancel',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
        },
        features: [
            'Up to 1 property',
            'Up to 5 units',
            'Basic tenant management',
            'Email support',
            'Mobile app access'
        ],
        limits: {
            properties: 1,
            units: 5,
            users: 1,
            storage: 1,
            apiCalls: 1000
        },
        support: 'email',
        stripePriceIds: {
            monthly: null,
            annual: null
        }
    },
    STARTER: {
        id: 'STARTER',
        name: 'Starter',
        description: 'Great for small property managers',
        price: {
            monthly: 29,
            annual: 290
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
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
        limits: {
            properties: 5,
            units: 50,
            users: 3,
            storage: 10,
            apiCalls: 10000
        },
        support: 'email',
        stripePriceIds: {
            monthly: 'price_1Rbnyk00PMlKUSP0oGJV2i1G',
            annual: 'price_1Rbnyk00PMlKUSP0uS33sCq3'
        }
    },
    GROWTH: {
        id: 'GROWTH',
        name: 'Growth',
        description: 'Ideal for growing property management companies',
        price: {
            monthly: 79,
            annual: 790
        },
        trial: {
            trialPeriodDays: 14,
            trialEndBehavior: 'pause',
            collectPaymentMethod: false,
            reminderDaysBeforeEnd: 3
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
        limits: {
            properties: 20,
            units: 200,
            users: 10,
            storage: 50,
            apiCalls: 50000
        },
        support: 'priority',
        stripePriceIds: {
            monthly: 'price_1Rbnzv00PMlKUSP0fq5R5MNV',
            annual: 'price_1Rbnzv00PMlKUSP0jIq3BxTy'
        }
    },
    TENANTFLOW_MAX: {
        id: 'TENANTFLOW_MAX',
        name: 'TenantFlow Max',
        description: 'For large property management operations',
        price: {
            monthly: 299,
            annual: 2990
        },
        trial: {
            trialPeriodDays: 30,
            trialEndBehavior: 'pause',
            collectPaymentMethod: true,
            reminderDaysBeforeEnd: 7
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
        limits: {
            properties: -1,
            units: -1,
            users: -1,
            storage: -1,
            apiCalls: -1
        },
        support: 'dedicated',
        stripePriceIds: {
            monthly: 'price_1Rbo0P00PMlKUSP0Isi7U1Wr',
            annual: 'price_1Rbo0r00PMlKUSP0rzUhwgkO'
        }
    }
};
function getProductTier(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    if (!tier) {
        throw new Error(`Product tier not found for plan type: ${planType}`);
    }
    return tier;
}
function getStripePriceId(planType, interval) {
    const tier = exports.PRODUCT_TIERS[planType];
    if (!tier)
        return null;
    return tier.stripePriceIds[interval];
}
function hasTrial(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    if (!tier)
        return false;
    return tier.trial.trialPeriodDays > 0;
}
function getTrialConfig(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    return tier?.trial;
}
function checkPlanLimits(planType, usage) {
    const tier = exports.PRODUCT_TIERS[planType];
    const exceededLimits = [];
    if (!tier) {
        return { exceeded: false, limits: [] };
    }
    if (tier.limits.properties !== -1 && usage.properties && usage.properties > tier.limits.properties) {
        exceededLimits.push({
            type: 'properties',
            current: usage.properties,
            limit: tier.limits.properties
        });
    }
    if (tier.limits.units !== -1 && usage.units && usage.units > tier.limits.units) {
        exceededLimits.push({
            type: 'units',
            current: usage.units,
            limit: tier.limits.units
        });
    }
    if (tier.limits.users !== undefined && tier.limits.users !== -1 && usage.users && usage.users > tier.limits.users) {
        exceededLimits.push({
            type: 'users',
            current: usage.users,
            limit: tier.limits.users
        });
    }
    if (tier.limits.storage !== undefined && tier.limits.storage !== -1 && usage.storage && usage.storage > tier.limits.storage) {
        exceededLimits.push({
            type: 'storage',
            current: usage.storage,
            limit: tier.limits.storage
        });
    }
    if (tier.limits.apiCalls !== undefined && tier.limits.apiCalls !== -1 && usage.apiCalls && usage.apiCalls > tier.limits.apiCalls) {
        exceededLimits.push({
            type: 'apiCalls',
            current: usage.apiCalls,
            limit: tier.limits.apiCalls
        });
    }
    return {
        exceeded: exceededLimits.length > 0,
        limits: exceededLimits
    };
}
function getRecommendedUpgrade(currentPlan, usage) {
    const planOrder = ['FREETRIAL', 'STARTER', 'GROWTH', 'TENANTFLOW_MAX'];
    const currentIndex = planOrder.indexOf(currentPlan);
    for (let i = currentIndex + 1; i < planOrder.length; i++) {
        const plan = planOrder[i];
        if (!plan)
            continue;
        const tier = exports.PRODUCT_TIERS[plan];
        if (!tier)
            continue;
        const fitsUsage = (tier.limits.properties === -1 || tier.limits.properties === undefined || !usage.properties || usage.properties <= tier.limits.properties) &&
            (tier.limits.units === -1 || tier.limits.units === undefined || !usage.units || usage.units <= tier.limits.units) &&
            (tier.limits.users === -1 || tier.limits.users === undefined || !usage.users || usage.users <= tier.limits.users);
        if (fitsUsage) {
            return plan;
        }
    }
    return null;
}
function calculateAnnualSavings(planType) {
    const tier = exports.PRODUCT_TIERS[planType];
    const monthlyCost = tier.price.monthly * 12;
    const annualCost = tier.price.annual;
    return monthlyCost - annualCost;
}
