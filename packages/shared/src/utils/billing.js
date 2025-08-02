"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUBSCRIPTION_URLS = void 0;
exports.getPlanById = getPlanById;
exports.calculateProratedAmount = calculateProratedAmount;
exports.calculateAnnualPrice = calculateAnnualPrice;
exports.calculateAnnualSavings = calculateAnnualSavings;
const billing_1 = require("../constants/billing");
function getPlanById(planId) {
    return billing_1.PLANS.find(plan => plan.id === planId);
}
function calculateProratedAmount(amount, daysRemaining, daysInPeriod) {
    return Math.round((amount * daysRemaining) / daysInPeriod);
}
function calculateAnnualPrice(monthlyPrice) {
    return Math.round(monthlyPrice * 12 * 0.9);
}
function calculateAnnualSavings(monthlyPrice) {
    const yearlyWithoutDiscount = monthlyPrice * 12;
    const yearlyWithDiscount = calculateAnnualPrice(monthlyPrice);
    return yearlyWithoutDiscount - yearlyWithDiscount;
}
exports.SUBSCRIPTION_URLS = {
    MANAGE: '/dashboard/subscription',
    UPGRADE: '/dashboard/subscription/upgrade',
    CANCEL: '/dashboard/subscription/cancel',
    PORTAL: '/dashboard/billing-portal',
    dashboardWithTrial: '/dashboard?trial=success',
    dashboardWithSetup: '/dashboard?setup=complete'
};
