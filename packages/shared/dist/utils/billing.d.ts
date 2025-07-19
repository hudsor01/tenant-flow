/**
 * Billing utilities
 * Helper functions for billing and subscription display
 */
type PlanType = 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
export declare const getPlanTypeLabel: (plan: PlanType) => string;
export {};
