/**
 * Billing utility functions
 * Helper functions for subscription calculations and plan management
 */
import { PLANS } from '../constants/billing';
export declare function getPlanById(planId: string): typeof PLANS[0] | undefined;
export declare function calculateProratedAmount(amount: number, daysRemaining: number, daysInPeriod: number): number;
export declare function calculateAnnualPrice(monthlyPrice: number): number;
export declare function calculateAnnualSavings(monthlyPrice: number): number;
export declare const SUBSCRIPTION_URLS: {
    readonly MANAGE: "/dashboard/subscription";
    readonly UPGRADE: "/dashboard/subscription/upgrade";
    readonly CANCEL: "/dashboard/subscription/cancel";
    readonly PORTAL: "/dashboard/billing-portal";
    readonly dashboardWithTrial: "/dashboard?trial=success";
    readonly dashboardWithSetup: "/dashboard?setup=complete";
};
//# sourceMappingURL=billing.d.ts.map