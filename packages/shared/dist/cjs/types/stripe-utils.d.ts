/**
 * Stripe Utility Functions
 *
 * Helper functions for common Stripe operations, error handling, and data transformations.
 * Provides consistent behavior across frontend and backend implementations.
 *
 * @fileoverview Utility functions for Stripe integration
 */
import { type StripeErrorCode, type StripeErrorCategory, type StripeErrorSeverity, type StandardizedStripeError, type StripeRetryConfig, type PlanType, type BillingPeriod, type SubscriptionStatus, type WebhookEventType, type ClientSafeStripeError, type StripeErrorAnalytics } from './stripe';
/**
 * Generate a unique error ID for tracking and debugging
 */
export declare function generateErrorId(): string;
/**
 * Get error category from error code
 */
export declare function getErrorCategory(code: StripeErrorCode): StripeErrorCategory;
/**
 * Get error severity from error code
 */
export declare function getErrorSeverity(code: StripeErrorCode): StripeErrorSeverity;
/**
 * Check if error code is retryable
 */
export declare function isRetryableErrorCode(code: StripeErrorCode): boolean;
/**
 * Calculate retry delay with exponential backoff and jitter
 */
export declare function calculateRetryDelay(attemptCount: number, config?: Partial<StripeRetryConfig>): number;
/**
 * Convert StandardizedStripeError to client-safe version
 */
export declare function toClientSafeError(error: StandardizedStripeError): ClientSafeStripeError;
/**
 * Generate analytics data from error
 */
export declare function generateErrorAnalytics(error: StandardizedStripeError): StripeErrorAnalytics;
/**
 * Create a standardized error from partial information
 */
export declare function createStandardizedError(code: StripeErrorCode, message: string, context: {
    operation: string;
    resource: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
}, options?: {
    userMessage?: string;
    details?: string;
    retryAfter?: number;
}): StandardizedStripeError;
/**
 * Generate user-friendly error messages
 */
export declare function generateUserMessage(code: StripeErrorCode): string;
/**
 * Get plan type from Stripe price ID
 */
export declare function getPlanTypeFromPriceId(priceId: string): PlanType | null;
/**
 * Get billing period from Stripe price ID
 */
export declare function getBillingPeriodFromPriceId(priceId: string): BillingPeriod | null;
/**
 * Format price for display
 */
export declare function formatPrice(amount: number, currency?: string, interval?: BillingPeriod): string;
/**
 * Calculate annual savings percentage
 */
export declare function calculateAnnualSavings(monthlyPrice: number, annualPrice: number): number;
/**
 * Get plan display name
 */
export declare function getPlanDisplayName(planType: PlanType): string;
/**
 * Check if subscription is active
 */
export declare function isActiveSubscription(status: SubscriptionStatus): boolean;
/**
 * Check if subscription is in grace period
 */
export declare function isInGracePeriod(status: SubscriptionStatus): boolean;
/**
 * Check if subscription needs attention
 */
export declare function needsAttention(status: SubscriptionStatus): boolean;
/**
 * Get subscription status display text
 */
export declare function getSubscriptionStatusDisplay(status: SubscriptionStatus): string;
/**
 * Calculate days until subscription expires
 */
export declare function getDaysUntilExpiry(currentPeriodEnd: Date | null): number | null;
/**
 * Calculate trial days remaining
 */
export declare function getTrialDaysRemaining(trialEnd: Date | null): number | null;
/**
 * Extract relevant data from webhook event
 */
export declare function extractWebhookData<T = Record<string, unknown>>(_eventType: WebhookEventType, eventData: Record<string, unknown>): T;
/**
 * Check if webhook event should be processed
 */
export declare function shouldProcessWebhookEvent(eventType: WebhookEventType, supportedEvents: readonly WebhookEventType[]): boolean;
/**
 * Get webhook event priority for queue processing
 */
export declare function getWebhookEventPriority(eventType: WebhookEventType): 'high' | 'medium' | 'low';
/**
 * Validate Stripe configuration completeness
 */
export declare function validateStripeConfig(config: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
}): {
    isValid: boolean;
    errors: string[];
};
/**
 * Sanitize metadata for Stripe (remove invalid characters, limit length)
 */
export declare function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string>;
/**
 * Generate idempotency key for Stripe requests
 */
export declare function generateIdempotencyKey(operation: string, params?: Record<string, unknown>): string;
export declare const StripeUtils: {
    readonly generateErrorId: typeof generateErrorId;
    readonly getErrorCategory: typeof getErrorCategory;
    readonly getErrorSeverity: typeof getErrorSeverity;
    readonly isRetryableErrorCode: typeof isRetryableErrorCode;
    readonly calculateRetryDelay: typeof calculateRetryDelay;
    readonly toClientSafeError: typeof toClientSafeError;
    readonly generateErrorAnalytics: typeof generateErrorAnalytics;
    readonly createStandardizedError: typeof createStandardizedError;
    readonly generateUserMessage: typeof generateUserMessage;
    readonly getPlanTypeFromPriceId: typeof getPlanTypeFromPriceId;
    readonly getBillingPeriodFromPriceId: typeof getBillingPeriodFromPriceId;
    readonly formatPrice: typeof formatPrice;
    readonly calculateAnnualSavings: typeof calculateAnnualSavings;
    readonly getPlanDisplayName: typeof getPlanDisplayName;
    readonly isActiveSubscription: typeof isActiveSubscription;
    readonly isInGracePeriod: typeof isInGracePeriod;
    readonly needsAttention: typeof needsAttention;
    readonly getSubscriptionStatusDisplay: typeof getSubscriptionStatusDisplay;
    readonly getDaysUntilExpiry: typeof getDaysUntilExpiry;
    readonly getTrialDaysRemaining: typeof getTrialDaysRemaining;
    readonly extractWebhookData: typeof extractWebhookData;
    readonly shouldProcessWebhookEvent: typeof shouldProcessWebhookEvent;
    readonly getWebhookEventPriority: typeof getWebhookEventPriority;
    readonly validateStripeConfig: typeof validateStripeConfig;
    readonly sanitizeMetadata: typeof sanitizeMetadata;
    readonly generateIdempotencyKey: typeof generateIdempotencyKey;
};
//# sourceMappingURL=stripe-utils.d.ts.map