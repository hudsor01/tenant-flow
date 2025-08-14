/**
 * Enhanced type-safe pricing configuration for 4-tier subscription system
 * Defines products, trials, limits, and features for each tier with branded types
 */
import type { PlanType } from '../types/stripe';
import type { ProductTierConfig, TrialConfig } from '../types/billing';
export type StripePriceId = `price_${string}`;
export type PlanId = 'trial' | 'starter' | 'growth' | 'max';
export type BillingInterval = 'monthly' | 'annual';
export type SupportTier = 'email' | 'priority' | 'dedicated';
export interface UsageMetrics {
    readonly properties: number;
    readonly units: number;
    readonly users: number;
    readonly storage: number;
    readonly apiCalls: number;
}
export interface PlanLimits {
    readonly properties: number;
    readonly units: number;
    readonly users: number;
    readonly storage: number;
    readonly apiCalls: number;
}
export interface EnhancedPricingConfig {
    readonly id: PlanType;
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
    readonly limits: PlanLimits;
    readonly features: readonly string[];
    readonly support: SupportTier;
    readonly trial: TrialConfig;
    readonly recommended?: boolean;
    readonly popular?: boolean;
}
/**
 * Production-ready enhanced pricing configuration for TenantFlow
 * 4 Products: Free Trial, Starter, Growth, TenantFlow Max
 * Immutable configuration with branded types for type safety
 */
export declare const ENHANCED_PRODUCT_TIERS: {
    readonly FREETRIAL: {
        readonly id: "FREETRIAL";
        readonly planId: "trial";
        readonly name: "Free Trial";
        readonly description: "Perfect for trying out TenantFlow";
        readonly price: {
            readonly monthly: 0;
            readonly annual: 0;
        };
        readonly stripePriceIds: {
            readonly monthly: StripePriceId;
            readonly annual: null;
        };
        readonly limits: {
            readonly properties: 1;
            readonly units: 5;
            readonly users: 1;
            readonly storage: 1;
            readonly apiCalls: 1000;
        };
        readonly features: readonly ["Up to 1 property", "Up to 5 units", "Basic tenant management", "Email support", "Mobile app access"];
        readonly support: "email";
        readonly trial: {
            readonly trialPeriodDays: 14;
            readonly trialEndBehavior: "cancel";
            readonly collectPaymentMethod: false;
            readonly reminderDaysBeforeEnd: 3;
        };
    };
    readonly STARTER: {
        readonly id: "STARTER";
        readonly planId: "starter";
        readonly name: "Starter";
        readonly description: "Great for small property managers";
        readonly price: {
            readonly monthly: 29;
            readonly annual: 290;
        };
        readonly stripePriceIds: {
            readonly monthly: StripePriceId;
            readonly annual: StripePriceId;
        };
        readonly limits: {
            readonly properties: 5;
            readonly units: 50;
            readonly users: 3;
            readonly storage: 10;
            readonly apiCalls: 10000;
        };
        readonly features: readonly ["Up to 5 properties", "Up to 50 units", "Advanced tenant management", "Lease management", "Maintenance tracking", "Financial reporting", "Priority email support", "API access"];
        readonly support: "email";
        readonly trial: {
            readonly trialPeriodDays: 14;
            readonly trialEndBehavior: "pause";
            readonly collectPaymentMethod: false;
            readonly reminderDaysBeforeEnd: 3;
        };
        readonly popular: true;
    };
    readonly GROWTH: {
        readonly id: "GROWTH";
        readonly planId: "growth";
        readonly name: "Growth";
        readonly description: "Ideal for growing property management companies";
        readonly price: {
            readonly monthly: 79;
            readonly annual: 790;
        };
        readonly stripePriceIds: {
            readonly monthly: StripePriceId;
            readonly annual: StripePriceId;
        };
        readonly limits: {
            readonly properties: 20;
            readonly units: 200;
            readonly users: 10;
            readonly storage: 50;
            readonly apiCalls: 50000;
        };
        readonly features: readonly ["Up to 20 properties", "Up to 200 units", "Everything in Starter", "Advanced analytics", "Custom reports", "Bulk operations", "Team collaboration", "Priority support", "Advanced API access", "Integrations"];
        readonly support: "priority";
        readonly trial: {
            readonly trialPeriodDays: 14;
            readonly trialEndBehavior: "pause";
            readonly collectPaymentMethod: false;
            readonly reminderDaysBeforeEnd: 3;
        };
        readonly recommended: true;
    };
    readonly TENANTFLOW_MAX: {
        readonly id: "TENANTFLOW_MAX";
        readonly planId: "max";
        readonly name: "TenantFlow Max";
        readonly description: "For large property management operations";
        readonly price: {
            readonly monthly: 199;
            readonly annual: 1990;
        };
        readonly stripePriceIds: {
            readonly monthly: StripePriceId;
            readonly annual: StripePriceId;
        };
        readonly limits: {
            readonly properties: -1;
            readonly units: -1;
            readonly users: -1;
            readonly storage: -1;
            readonly apiCalls: -1;
        };
        readonly features: readonly ["Unlimited properties", "Unlimited units", "Everything in Growth", "White-label options", "Custom integrations", "Dedicated account manager", "SLA guarantee", "24/7 phone support", "Custom training", "API rate limit bypass"];
        readonly support: "dedicated";
        readonly trial: {
            readonly trialPeriodDays: 30;
            readonly trialEndBehavior: "pause";
            readonly collectPaymentMethod: true;
            readonly reminderDaysBeforeEnd: 7;
        };
    };
};
export declare const PRODUCT_TIERS: Record<PlanType, ProductTierConfig>;
/**
 * Get product tier configuration by plan type
 */
export declare function getProductTier(planType: PlanType): ProductTierConfig;
/**
 * Enhanced type-safe functions for pricing operations
 */
/**
 * Get Stripe price ID for a plan and billing interval with type safety
 */
export declare function getStripePriceId(planType: PlanType, interval: BillingInterval): StripePriceId | null;
/**
 * Get enhanced product tier configuration by plan type
 */
export declare function getEnhancedProductTier(planType: PlanType): typeof ENHANCED_PRODUCT_TIERS[PlanType];
/**
 * Check if a plan has a free trial
 */
export declare function hasTrial(planType: PlanType): boolean;
/**
 * Get trial configuration for a plan
 */
export declare function getTrialConfig(planType: PlanType): TrialConfig | undefined;
/**
 * Enhanced plan limit checking with type safety
 */
export declare function checkPlanLimits(planType: PlanType, usage: Partial<UsageMetrics>): {
    readonly exceeded: boolean;
    readonly limits: readonly {
        readonly type: keyof UsageMetrics;
        readonly current: number;
        readonly limit: number;
        readonly utilizationPercent: number;
    }[];
    readonly warningLimits: readonly {
        readonly type: keyof UsageMetrics;
        readonly current: number;
        readonly limit: number;
        readonly utilizationPercent: number;
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