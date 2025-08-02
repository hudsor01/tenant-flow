"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_IDS = exports.validatePricingPlans = exports.getPaidPlans = exports.getFreePlan = exports.getRecommendedPlan = exports.getPlanById = exports.PRICING_PLANS = void 0;
exports.PRICING_PLANS = [
    {
        id: 'free',
        name: 'Free Trial',
        description: 'Perfect for getting started with property management',
        prices: {
            monthly: 0,
            yearly: 0,
        },
        features: [
            'Up to 2 properties',
            'Up to 5 tenants',
            'Basic maintenance tracking',
            'Tenant communication',
            'Document storage (1GB)',
            '14-day trial',
            'Email support',
        ],
        recommended: false,
        stripePriceIds: {
            monthly: '',
            yearly: '',
        },
        lookupKeys: {
            monthly: 'free_monthly',
            yearly: 'free_yearly',
        },
        limits: {
            properties: 2,
            tenants: 5,
            storage: 1,
        },
        cta: 'Start Free Trial',
    },
    {
        id: 'starter',
        name: 'Starter',
        description: 'Great for small property portfolios',
        prices: {
            monthly: 1900,
            yearly: 15200,
        },
        features: [
            'Up to 10 properties',
            'Up to 50 tenants',
            'Advanced maintenance workflow',
            'Automated rent reminders',
            'Financial reporting',
            'Document storage (10GB)',
            'Priority email support',
            'Mobile app access',
        ],
        recommended: false,
        stripePriceIds: {
            monthly: process.env.VITE_STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
            yearly: process.env.VITE_STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly',
        },
        lookupKeys: {
            monthly: 'starter_monthly',
            yearly: 'starter_yearly',
        },
        limits: {
            properties: 10,
            tenants: 50,
            storage: 10,
        },
        cta: 'Subscribe to Starter',
    },
    {
        id: 'growth',
        name: 'Growth',
        description: 'Ideal for growing property businesses',
        prices: {
            monthly: 4900,
            yearly: 39200,
        },
        features: [
            'Up to 50 properties',
            'Up to 250 tenants',
            'Advanced analytics & insights',
            'Custom report builder',
            'API access',
            'White-label options',
            'Document storage (50GB)',
            'Priority phone & email support',
            'Team collaboration tools',
            'Bulk operations',
        ],
        recommended: true,
        stripePriceIds: {
            monthly: process.env.VITE_STRIPE_GROWTH_MONTHLY_PRICE_ID || 'price_growth_monthly',
            yearly: process.env.VITE_STRIPE_GROWTH_YEARLY_PRICE_ID || 'price_growth_yearly',
        },
        lookupKeys: {
            monthly: 'growth_monthly',
            yearly: 'growth_yearly',
        },
        limits: {
            properties: 50,
            tenants: 250,
            storage: 50,
        },
        cta: 'Subscribe to Growth',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        description: 'Unlimited growth potential for large portfolios',
        prices: {
            monthly: 14900,
            yearly: 119200,
        },
        features: [
            'Unlimited properties',
            'Unlimited tenants',
            'Custom integrations',
            'Advanced security features',
            'On-premise deployment options',
            'Dedicated account manager',
            'Unlimited storage',
            '24/7 priority support',
            'Custom training & onboarding',
            'SLA guarantee',
            'Advanced user permissions',
            'Custom branding',
        ],
        recommended: false,
        stripePriceIds: {
            monthly: process.env.VITE_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
            yearly: process.env.VITE_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly',
        },
        lookupKeys: {
            monthly: 'enterprise_monthly',
            yearly: 'enterprise_yearly',
        },
        limits: {
            properties: null,
            tenants: null,
            storage: null,
        },
        cta: 'Contact Sales',
    },
];
const getPlanById = (planId) => {
    return exports.PRICING_PLANS.find(plan => plan.id === planId);
};
exports.getPlanById = getPlanById;
const getRecommendedPlan = () => {
    const recommended = exports.PRICING_PLANS.find(plan => plan.recommended);
    if (!recommended) {
        throw new Error('No recommended plan found in configuration');
    }
    return recommended;
};
exports.getRecommendedPlan = getRecommendedPlan;
const getFreePlan = () => {
    const freePlan = exports.PRICING_PLANS.find(plan => plan.id === 'free');
    if (!freePlan) {
        throw new Error('No free plan found in configuration');
    }
    return freePlan;
};
exports.getFreePlan = getFreePlan;
const getPaidPlans = () => {
    return exports.PRICING_PLANS.filter(plan => plan.id !== 'free');
};
exports.getPaidPlans = getPaidPlans;
const validatePricingPlans = () => {
    return exports.PRICING_PLANS.every(plan => {
        return !!(plan.id &&
            plan.name &&
            plan.description &&
            typeof plan.prices.monthly === 'number' &&
            typeof plan.prices.yearly === 'number' &&
            Array.isArray(plan.features) &&
            plan.features.length > 0);
    });
};
exports.validatePricingPlans = validatePricingPlans;
exports.PLAN_IDS = {
    FREE: 'free',
    STARTER: 'starter',
    GROWTH: 'growth',
    ENTERPRISE: 'enterprise',
};
