/**
 * Currency and price formatting utilities for consistent display across the application
 * Consolidates multiple formatPrice implementations into a single shared utility
 */
export type BillingInterval = 'monthly' | 'annual' | 'month' | 'year';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';
export interface CurrencyFormatOptions {
    locale?: string;
    currency?: CurrencyCode;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
}
export interface PriceFormatOptions extends CurrencyFormatOptions {
    interval?: BillingInterval;
    showInterval?: boolean;
    fromCents?: boolean;
}
/**
 * Core currency formatter with flexible options
 */
export declare const formatCurrency: (amount: number, options?: CurrencyFormatOptions) => string;
/**
 * Format price with special handling for Free/Custom and intervals
 * Consolidates all formatPrice implementations across the codebase
 */
export declare const formatPrice: (amount: number, options?: PriceFormatOptions) => string;
/**
 * Get interval suffix for pricing display
 */
export declare const getIntervalSuffix: (interval: BillingInterval) => string;
/**
 * Format large numbers with K, M, B suffixes
 */
export declare const formatCompactCurrency: (amount: number, currency?: CurrencyCode) => string;
/**
 * Format percentage with consistent styling
 */
export declare const formatPercentage: (value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}) => string;
/**
 * Format numbers with thousand separators
 */
export declare const formatNumber: (value: number, options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
}) => string;
/**
 * Format currency change with proper +/- indicators
 */
export declare const formatCurrencyChange: (amount: number, showSign?: boolean, currency?: CurrencyCode) => string;
/**
 * Format percentage change with proper +/- indicators
 */
export declare const formatPercentageChange: (value: number, showSign?: boolean) => string;
/**
 * Get currency display for dashboard cards
 */
export declare const getDashboardCurrency: (amount: number, currency?: CurrencyCode) => {
    value: string;
    compact: string;
    raw: number;
};
/**
 * Get percentage display with color coding
 */
export declare const getDashboardPercentage: (value: number) => {
    value: string;
    color: string;
    trend: "positive" | "negative" | "neutral";
};
/**
 * Collection rate status helper
 */
export declare const getCollectionRateStatus: (rate: number) => {
    status: string;
    color: string;
    icon: string;
};
export declare const formatPriceFromCents: (priceInCents: number, currency?: CurrencyCode) => string;
export declare const formatPriceWithInterval: (amount: number, interval: BillingInterval, fromCents?: boolean) => string;
//# sourceMappingURL=currency.d.ts.map