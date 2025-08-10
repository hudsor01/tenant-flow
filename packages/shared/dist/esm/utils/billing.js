/**
 * Billing utility functions
 * Helper functions for subscription calculations and plan management
 */
import { PLANS } from '../constants/billing';
export function getPlanById(planId) {
    return PLANS.find(plan => plan.id === planId);
}
export function calculateProratedAmount(amount, daysRemaining, daysInPeriod) {
    return Math.round((amount * daysRemaining) / daysInPeriod);
}
export function calculateAnnualPrice(monthlyPrice) {
    // 10% discount for annual billing
    return Math.round(monthlyPrice * 12 * 0.9);
}
export function calculateAnnualSavings(monthlyPrice) {
    const yearlyWithoutDiscount = monthlyPrice * 12;
    const yearlyWithDiscount = calculateAnnualPrice(monthlyPrice);
    return yearlyWithoutDiscount - yearlyWithDiscount;
}
export const SUBSCRIPTION_URLS = {
    MANAGE: '/dashboard/subscription',
    UPGRADE: '/dashboard/subscription/upgrade',
    CANCEL: '/dashboard/subscription/cancel',
    PORTAL: '/dashboard/billing-portal',
    dashboardWithTrial: '/dashboard?trial=success',
    dashboardWithSetup: '/dashboard?setup=complete'
};
//# sourceMappingURL=billing.js.map