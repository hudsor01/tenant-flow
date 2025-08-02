"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePricingPlan = exports.getStripeErrorMessage = exports.calculateYearlySavings = exports.formatPrice = void 0;
const formatPrice = (priceInCents, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
    }).format(priceInCents / 100);
};
exports.formatPrice = formatPrice;
const calculateYearlySavings = (monthlyPrice, yearlyPrice) => {
    const yearlyMonthlyEquivalent = monthlyPrice * 12;
    const savings = yearlyMonthlyEquivalent - yearlyPrice;
    return Math.round((savings / yearlyMonthlyEquivalent) * 100);
};
exports.calculateYearlySavings = calculateYearlySavings;
const getStripeErrorMessage = (error) => {
    switch (error.code) {
        case 'card_declined':
            return 'Your card was declined. Please try a different payment method.';
        case 'expired_card':
            return 'Your card has expired. Please use a different card.';
        case 'insufficient_funds':
            return 'Your card has insufficient funds. Please use a different card.';
        case 'incorrect_cvc':
            return 'Your card\'s security code is incorrect. Please try again.';
        case 'processing_error':
            return 'An error occurred while processing your card. Please try again.';
        case 'rate_limit_error':
            return 'Too many requests made too quickly. Please wait a moment and try again.';
        default:
            return error.message || 'An unexpected error occurred. Please try again.';
    }
};
exports.getStripeErrorMessage = getStripeErrorMessage;
const validatePricingPlan = (plan) => {
    return !!(plan.id &&
        plan.name &&
        plan.description &&
        plan.prices.monthly >= 0 &&
        plan.prices.yearly >= 0 &&
        Array.isArray(plan.features) &&
        plan.stripePriceIds.monthly &&
        plan.stripePriceIds.yearly &&
        plan.lookupKeys.monthly &&
        plan.lookupKeys.yearly);
};
exports.validatePricingPlan = validatePricingPlan;
