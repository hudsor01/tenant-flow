"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePricingPlan = exports.getStripeErrorMessage = exports.calculateYearlySavings = void 0;
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
const validatePricingPlan = (tier) => {
    return !!(tier.id &&
        tier.name &&
        tier.description &&
        tier.price.monthly >= 0 &&
        tier.price.annual >= 0 &&
        Array.isArray(tier.features) &&
        (tier.stripePriceIds.monthly || tier.stripePriceIds.annual));
};
exports.validatePricingPlan = validatePricingPlan;
