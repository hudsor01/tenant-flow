"use strict";
/**
 * Currency and price formatting utilities for consistent display across the application
 * Consolidates multiple formatPrice implementations into a single shared utility
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPriceWithInterval = exports.formatPriceFromCents = exports.getCollectionRateStatus = exports.getDashboardPercentage = exports.getDashboardCurrency = exports.formatPercentageChange = exports.formatCurrencyChange = exports.formatNumber = exports.formatPercentage = exports.formatCompactCurrency = exports.getIntervalSuffix = exports.formatPrice = exports.formatCurrency = void 0;
/**
 * Core currency formatter with flexible options
 */
const formatCurrency = (amount, options = {}) => {
    const { locale = 'en-US', currency = 'USD', minimumFractionDigits = 0, maximumFractionDigits = 2, compact = false } = options;
    const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    return formatter.format(amount);
};
exports.formatCurrency = formatCurrency;
/**
 * Format price with special handling for Free/Custom and intervals
 * Consolidates all formatPrice implementations across the codebase
 */
const formatPrice = (amount, options = {}) => {
    const { interval, showInterval = true, fromCents = false, currency = 'USD', minimumFractionDigits, maximumFractionDigits, ...formatOptions } = options;
    // Handle special values
    if (amount === 0)
        return 'Free';
    if (amount === -1)
        return 'Custom';
    // Convert from cents if needed
    const dollarAmount = fromCents ? amount / 100 : amount;
    // Determine fraction digits based on amount if not specified
    const shouldShowDecimals = fromCents ? amount % 100 !== 0 : dollarAmount % 1 !== 0;
    const finalMinFractionDigits = minimumFractionDigits ?? (shouldShowDecimals ? 2 : 0);
    const finalMaxFractionDigits = maximumFractionDigits ?? (shouldShowDecimals ? 2 : 0);
    // Format the currency
    const formatted = (0, exports.formatCurrency)(dollarAmount, {
        currency,
        minimumFractionDigits: finalMinFractionDigits,
        maximumFractionDigits: finalMaxFractionDigits,
        ...formatOptions
    });
    // Add interval suffix if requested
    if (showInterval && interval) {
        const suffix = (0, exports.getIntervalSuffix)(interval);
        return `${formatted}${suffix}`;
    }
    return formatted;
};
exports.formatPrice = formatPrice;
/**
 * Get interval suffix for pricing display
 */
const getIntervalSuffix = (interval) => {
    switch (interval) {
        case 'monthly':
        case 'month':
            return '/mo';
        case 'annual':
        case 'year':
            return '/yr';
        default:
            return '';
    }
};
exports.getIntervalSuffix = getIntervalSuffix;
/**
 * Format large numbers with K, M, B suffixes
 */
const formatCompactCurrency = (amount, currency = 'USD') => {
    return (0, exports.formatCurrency)(amount, {
        compact: true,
        maximumFractionDigits: 1,
        currency
    });
};
exports.formatCompactCurrency = formatCompactCurrency;
/**
 * Format percentage with consistent styling
 */
const formatPercentage = (value, options = {}) => {
    const { minimumFractionDigits = 0, maximumFractionDigits = 1 } = options;
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits,
        maximumFractionDigits
    });
    return formatter.format(value / 100);
};
exports.formatPercentage = formatPercentage;
/**
 * Format numbers with thousand separators
 */
const formatNumber = (value, options = {}) => {
    const { minimumFractionDigits = 0, maximumFractionDigits = 0, compact = false } = options;
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits,
        maximumFractionDigits,
        notation: compact ? 'compact' : 'standard',
        compactDisplay: 'short'
    });
    return formatter.format(value);
};
exports.formatNumber = formatNumber;
/**
 * Format currency change with proper +/- indicators
 */
const formatCurrencyChange = (amount, showSign = true, currency = 'USD') => {
    const formatted = (0, exports.formatCurrency)(Math.abs(amount), { currency });
    if (!showSign)
        return formatted;
    return amount >= 0 ? `+${formatted}` : `-${formatted}`;
};
exports.formatCurrencyChange = formatCurrencyChange;
/**
 * Format percentage change with proper +/- indicators
 */
const formatPercentageChange = (value, showSign = true) => {
    const formatted = (0, exports.formatPercentage)(Math.abs(value));
    if (!showSign)
        return formatted;
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
};
exports.formatPercentageChange = formatPercentageChange;
/**
 * Get currency display for dashboard cards
 */
const getDashboardCurrency = (amount, currency = 'USD') => {
    return {
        value: (0, exports.formatCurrency)(amount, { currency }),
        compact: (0, exports.formatCompactCurrency)(amount, currency),
        raw: amount
    };
};
exports.getDashboardCurrency = getDashboardCurrency;
/**
 * Get percentage display with color coding
 */
const getDashboardPercentage = (value) => {
    let trend;
    if (value > 0) {
        trend = 'positive';
    }
    else if (value < 0) {
        trend = 'negative';
    }
    else {
        trend = 'neutral';
    }
    let color;
    if (trend === 'positive') {
        color = 'text-green-600';
    }
    else if (trend === 'negative') {
        color = 'text-red-600';
    }
    else {
        color = 'text-muted-foreground';
    }
    return {
        value: (0, exports.formatPercentage)(value),
        color,
        trend
    };
};
exports.getDashboardPercentage = getDashboardPercentage;
/**
 * Collection rate status helper
 */
const getCollectionRateStatus = (rate) => {
    if (rate >= 95) {
        return { status: 'Excellent', color: 'text-green-600', icon: '🎯' };
    }
    else if (rate >= 85) {
        return { status: 'Good', color: 'text-blue-600', icon: '👍' };
    }
    else if (rate >= 70) {
        return { status: 'Fair', color: 'text-orange-600', icon: '⚠️' };
    }
    else {
        return { status: 'Poor', color: 'text-red-600', icon: '🔻' };
    }
};
exports.getCollectionRateStatus = getCollectionRateStatus;
// Legacy aliases for backward compatibility
const formatPriceFromCents = (priceInCents, currency = 'USD') => {
    return (0, exports.formatPrice)(priceInCents, { fromCents: true, currency, showInterval: false });
};
exports.formatPriceFromCents = formatPriceFromCents;
const formatPriceWithInterval = (amount, interval, fromCents = false) => {
    return (0, exports.formatPrice)(amount, { interval, fromCents });
};
exports.formatPriceWithInterval = formatPriceWithInterval;
//# sourceMappingURL=currency.js.map