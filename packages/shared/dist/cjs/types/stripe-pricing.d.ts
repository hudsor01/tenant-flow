/**
 * Stripe Pricing Component Types
 * Based on official Stripe documentation and best practices
 */
import type { StripeError, BillingPeriod } from './stripe';
import type { ProductTierConfig } from '../types/billing';
export type BillingInterval = BillingPeriod;
export interface CreateCheckoutSessionRequest extends Record<string, unknown> {
    priceId?: string;
    lookupKey?: string;
    billingInterval: BillingInterval;
    customerId?: string;
    customerEmail?: string;
    successUrl?: string;
    cancelUrl?: string;
    mode?: 'payment' | 'subscription' | 'setup';
    allowPromotionCodes?: boolean;
    metadata?: Record<string, string>;
}
export interface CreateCheckoutSessionResponse {
    url: string;
    sessionId: string;
}
export interface CreatePortalSessionRequest {
    customerId: string;
    returnUrl?: string;
}
export interface CreatePortalSessionResponse {
    url: string;
}
export type SubscriptionStatus = 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused' | 'updating';
export interface PricingComponentProps {
    currentPlan?: string;
    customerId?: string;
    customerEmail?: string;
    onPlanSelect?: (tier: ProductTierConfig, billingInterval: BillingInterval) => void;
    onError?: (error: StripeError) => void;
    className?: string;
}
export interface PricingCardProps {
    tier: ProductTierConfig;
    billingInterval: BillingInterval;
    isCurrentPlan?: boolean;
    loading?: boolean;
    onSubscribe: () => void;
    className?: string;
}
export declare const calculateYearlySavings: (monthlyPrice: number, yearlyPrice: number) => number;
export declare const getStripeErrorMessage: (error: StripeError) => string;
export declare const validatePricingPlan: (tier: ProductTierConfig) => boolean;
//# sourceMappingURL=stripe-pricing.d.ts.map