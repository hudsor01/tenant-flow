/**
 * Stripe Type Guards
 *
 * Runtime type validation utilities for Stripe types.
 * Provides type-safe guards for validating Stripe objects at runtime.
 *
 * @fileoverview Type guards for all Stripe-related types
 */
import { type PlanType, type BillingPeriod, type SubscriptionStatus, type WebhookEventType, type StripeErrorCode, type StripeDeclineCode, type StripeErrorCategory, type StripeErrorSeverity, type StripeApiVersion, type StandardizedStripeError, type StripeWebhookEvent, type PaymentMethod, type UserSubscription, type PlanConfig, type UsageMetrics, type StripeConfig, type CreateCheckoutSessionParams, type CreatePortalSessionParams, type StripeSuccessResponse, type StripeErrorResponse } from './stripe';
/**
 * Check if value is a valid PlanType
 */
export declare function isPlanType(value: unknown): value is PlanType;
/**
 * Check if value is a valid BillingPeriod
 */
export declare function isBillingPeriod(value: unknown): value is BillingPeriod;
/**
 * Check if value is a valid SubscriptionStatus
 */
export declare function isSubscriptionStatus(value: unknown): value is SubscriptionStatus;
/**
 * Check if value is a valid WebhookEventType
 */
export declare function isWebhookEventType(value: unknown): value is WebhookEventType;
/**
 * Check if value is a valid StripeErrorCode
 */
export declare function isStripeErrorCode(value: unknown): value is StripeErrorCode;
/**
 * Check if value is a valid StripeDeclineCode
 */
export declare function isStripeDeclineCode(value: unknown): value is StripeDeclineCode;
/**
 * Check if value is a valid StripeErrorCategory
 */
export declare function isStripeErrorCategory(value: unknown): value is StripeErrorCategory;
/**
 * Check if value is a valid StripeErrorSeverity
 */
export declare function isStripeErrorSeverity(value: unknown): value is StripeErrorSeverity;
/**
 * Check if value is a valid StripeApiVersion
 */
export declare function isStripeApiVersion(value: unknown): value is StripeApiVersion;
/**
 * Check if value is a valid StandardizedStripeError
 */
export declare function isStandardizedStripeError(value: unknown): value is StandardizedStripeError;
/**
 * Check if value is a valid StripeWebhookEvent
 */
export declare function isStripeWebhookEvent(value: unknown): value is StripeWebhookEvent;
/**
 * Check if value is a valid PaymentMethod
 */
export declare function isPaymentMethod(value: unknown): value is PaymentMethod;
/**
 * Check if value is a valid UserSubscription
 */
export declare function isUserSubscription(value: unknown): value is UserSubscription;
/**
 * Check if value is a valid PlanConfig
 */
export declare function isPlanConfig(value: unknown): value is PlanConfig;
/**
 * Check if value is a valid UsageMetrics
 */
export declare function isUsageMetrics(value: unknown): value is UsageMetrics;
/**
 * Check if value is a valid StripeConfig
 */
export declare function isStripeConfig(value: unknown): value is StripeConfig;
/**
 * Check if value is a valid CreateCheckoutSessionParams
 */
export declare function isCreateCheckoutSessionParams(value: unknown): value is CreateCheckoutSessionParams;
/**
 * Check if value is a valid CreatePortalSessionParams
 */
export declare function isCreatePortalSessionParams(value: unknown): value is CreatePortalSessionParams;
/**
 * Check if value is a valid StripeSuccessResponse
 */
export declare function isStripeSuccessResponse<T>(value: unknown): value is StripeSuccessResponse<T>;
/**
 * Check if value is a valid StripeErrorResponse
 */
export declare function isStripeErrorResponse(value: unknown): value is StripeErrorResponse;
/**
 * Check if error is retryable based on error code
 */
export declare function isRetryableError(error: StandardizedStripeError): boolean;
/**
 * Check if error is a card error
 */
export declare function isCardError(error: StandardizedStripeError): boolean;
/**
 * Check if error is a rate limit error
 */
export declare function isRateLimitError(error: StandardizedStripeError): boolean;
/**
 * Check if error is an infrastructure error
 */
export declare function isInfrastructureError(error: StandardizedStripeError): boolean;
/**
 * Check if error is a configuration error
 */
export declare function isConfigurationError(error: StandardizedStripeError): boolean;
/**
 * Check if error is critical severity
 */
export declare function isCriticalError(error: StandardizedStripeError): boolean;
/**
 * Check if error requires user action
 */
export declare function requiresUserAction(error: StandardizedStripeError): boolean;
/**
 * Check if value looks like a Stripe ID
 */
export declare function isStripeId(value: unknown, prefix?: string): value is string;
/**
 * Check if value is a Stripe customer ID
 */
export declare function isStripeCustomerId(value: unknown): value is string;
/**
 * Check if value is a Stripe subscription ID
 */
export declare function isStripeSubscriptionId(value: unknown): value is string;
/**
 * Check if value is a Stripe price ID
 */
export declare function isStripePriceId(value: unknown): value is string;
/**
 * Check if value is a Stripe payment method ID
 */
export declare function isStripePaymentMethodId(value: unknown): value is string;
/**
 * Check if value is a Stripe checkout session ID
 */
export declare function isStripeCheckoutSessionId(value: unknown): value is string;
/**
 * Check if value is a Stripe invoice ID
 */
export declare function isStripeInvoiceId(value: unknown): value is string;
/**
 * Check if value is a Stripe webhook secret
 */
export declare function isStripeWebhookSecret(value: unknown): value is string;
/**
 * Check if value is a Stripe API key (secret)
 */
export declare function isStripeSecretKey(value: unknown): value is string;
/**
 * Check if value is a Stripe publishable key
 */
export declare function isStripePublishableKey(value: unknown): value is string;
/**
 * Validate email format for Stripe operations
 */
export declare function isValidEmail(value: unknown): value is string;
/**
 * Validate currency code (3-letter ISO)
 */
export declare function isValidCurrency(value: unknown): value is string;
/**
 * Validate amount in cents (must be positive integer)
 */
export declare function isValidAmount(value: unknown): value is number;
/**
 * Validate URL format
 */
export declare function isValidUrl(value: unknown): value is string;
/**
 * Validate metadata object (string keys and values)
 */
export declare function isValidMetadata(value: unknown): value is Record<string, string>;
/**
 * Comprehensive type guard collection for external use
 */
export declare const StripeTypeGuards: {
    readonly isPlanType: typeof isPlanType;
    readonly isBillingPeriod: typeof isBillingPeriod;
    readonly isSubscriptionStatus: typeof isSubscriptionStatus;
    readonly isWebhookEventType: typeof isWebhookEventType;
    readonly isStripeErrorCode: typeof isStripeErrorCode;
    readonly isStripeDeclineCode: typeof isStripeDeclineCode;
    readonly isStripeErrorCategory: typeof isStripeErrorCategory;
    readonly isStripeErrorSeverity: typeof isStripeErrorSeverity;
    readonly isStripeApiVersion: typeof isStripeApiVersion;
    readonly isStandardizedStripeError: typeof isStandardizedStripeError;
    readonly isStripeWebhookEvent: typeof isStripeWebhookEvent;
    readonly isPaymentMethod: typeof isPaymentMethod;
    readonly isUserSubscription: typeof isUserSubscription;
    readonly isPlanConfig: typeof isPlanConfig;
    readonly isUsageMetrics: typeof isUsageMetrics;
    readonly isStripeConfig: typeof isStripeConfig;
    readonly isCreateCheckoutSessionParams: typeof isCreateCheckoutSessionParams;
    readonly isCreatePortalSessionParams: typeof isCreatePortalSessionParams;
    readonly isStripeSuccessResponse: typeof isStripeSuccessResponse;
    readonly isStripeErrorResponse: typeof isStripeErrorResponse;
    readonly isRetryableError: typeof isRetryableError;
    readonly isCardError: typeof isCardError;
    readonly isRateLimitError: typeof isRateLimitError;
    readonly isInfrastructureError: typeof isInfrastructureError;
    readonly isConfigurationError: typeof isConfigurationError;
    readonly isCriticalError: typeof isCriticalError;
    readonly requiresUserAction: typeof requiresUserAction;
    readonly isStripeId: typeof isStripeId;
    readonly isStripeCustomerId: typeof isStripeCustomerId;
    readonly isStripeSubscriptionId: typeof isStripeSubscriptionId;
    readonly isStripePriceId: typeof isStripePriceId;
    readonly isStripePaymentMethodId: typeof isStripePaymentMethodId;
    readonly isStripeCheckoutSessionId: typeof isStripeCheckoutSessionId;
    readonly isStripeInvoiceId: typeof isStripeInvoiceId;
    readonly isStripeWebhookSecret: typeof isStripeWebhookSecret;
    readonly isStripeSecretKey: typeof isStripeSecretKey;
    readonly isStripePublishableKey: typeof isStripePublishableKey;
    readonly isValidEmail: typeof isValidEmail;
    readonly isValidCurrency: typeof isValidCurrency;
    readonly isValidAmount: typeof isValidAmount;
    readonly isValidUrl: typeof isValidUrl;
    readonly isValidMetadata: typeof isValidMetadata;
};
//# sourceMappingURL=stripe-guards.d.ts.map