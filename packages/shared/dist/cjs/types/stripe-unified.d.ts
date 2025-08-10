/**
 * Unified Stripe Error Handling Types
 *
 * Comprehensive type definitions for the unified Stripe error handling system.
 * These types provide consistent error handling patterns across frontend and backend.
 */
import type { StandardizedStripeError, StripeErrorCode, StripeErrorCategory, StripeErrorSeverity, StripeRetryConfig } from './stripe';
export interface StripeErrorContext {
    operation: string;
    resource: string;
    metadata?: Record<string, unknown>;
    userId?: string;
    requestId?: string;
}
export type RetryConfig = StripeRetryConfig;
export interface StripeErrorAnalytics {
    category: StripeErrorCategory;
    severity: StripeErrorSeverity;
    actionRequired: boolean;
    escalateToStripe: boolean;
}
export type StripeDeclineCode = 'insufficient_funds' | 'card_declined' | 'expired_card' | 'incorrect_cvc' | 'processing_error' | 'card_not_supported' | 'currency_not_supported' | 'lost_card' | 'stolen_card' | 'generic_decline' | 'fraudulent' | 'merchant_blacklist' | 'pickup_card' | 'restricted_card' | 'revocation_of_all_authorizations' | 'revocation_of_authorization' | 'security_violation' | 'service_not_allowed' | 'stop_payment_order' | 'testmode_decline' | 'transaction_not_allowed' | 'try_again_later' | 'withdrawal_count_limit_exceeded';
export interface StripeErrorResponse {
    success: false;
    error: {
        code: StripeErrorCode;
        message: string;
        userMessage: string;
        errorId: string;
        details?: string;
        retryable: boolean;
        retryAfter?: number;
        analytics?: StripeErrorAnalytics;
    };
    metadata?: {
        requestId?: string;
        timestamp: string;
        operation: string;
        resource: string;
    };
}
export interface StripeSuccessResponse<T = unknown> {
    success: true;
    data: T;
    metadata?: {
        requestId?: string;
        timestamp: string;
        operation: string;
        resource: string;
    };
}
export type StripeApiResponse<T = unknown> = StripeSuccessResponse<T> | StripeErrorResponse;
export interface ClientSafeStripeError {
    code: StripeErrorCode;
    userMessage: string;
    retryable: boolean;
    retryAfter?: number;
    errorId: string;
    category: StripeErrorCategory;
    severity: StripeErrorSeverity;
}
export interface StripeErrorHandlerConfig {
    defaultRetryConfig: RetryConfig;
    enableAnalytics: boolean;
    enableDetailedLogging: boolean;
    customErrorMessages?: Partial<Record<StripeErrorCode, string>>;
}
export interface StripeWebhookError extends StandardizedStripeError {
    webhookEventId?: string;
    webhookEventType?: string;
    processingAttempt: number;
}
export interface PaymentMethodError {
    code: StripeErrorCode;
    declineCode?: StripeDeclineCode;
    userMessage: string;
    retryable: boolean;
    suggestedActions: string[];
}
export interface SubscriptionErrorContext extends StripeErrorContext {
    subscriptionId?: string;
    customerId?: string;
    priceId?: string;
    planType?: string;
}
export interface BillingErrorContext extends StripeErrorContext {
    amount?: number;
    currency?: string;
    invoiceId?: string;
    paymentIntentId?: string;
}
export interface StripeErrorUtils {
    isRetryableError: (error: StandardizedStripeError) => boolean;
    getRetryDelay: (attemptCount: number, config?: Partial<RetryConfig>) => number;
    categorizeError: (code: StripeErrorCode) => StripeErrorCategory;
    getSeverity: (code: StripeErrorCode) => StripeErrorSeverity;
    toClientSafeError: (error: StandardizedStripeError) => ClientSafeStripeError;
    getAnalytics: (error: StandardizedStripeError) => StripeErrorAnalytics;
}
export declare const STRIPE_ERROR_CONSTANTS: {
    readonly DEFAULT_RETRY_ATTEMPTS: 3;
    readonly DEFAULT_BASE_DELAY_MS: 1000;
    readonly DEFAULT_MAX_DELAY_MS: 10000;
    readonly DEFAULT_EXPONENTIAL_BASE: 2;
    readonly DEFAULT_JITTER_MS: 100;
    readonly RETRYABLE_ERROR_CODES: readonly ["RATE_LIMIT_ERROR", "API_ERROR", "CONNECTION_ERROR", "NETWORK_ERROR", "TIMEOUT_ERROR"];
    readonly CRITICAL_ERROR_CODES: readonly ["AUTHENTICATION_ERROR", "PERMISSION_ERROR"];
    readonly CLIENT_ERROR_CODES: readonly ["CARD_ERROR", "INVALID_REQUEST", "IDEMPOTENCY_ERROR"];
};
export interface StripeErrorTypeGuards {
    isStripeError: (error: unknown) => error is StandardizedStripeError;
    isRetryableError: (error: StandardizedStripeError) => boolean;
    isCardError: (error: StandardizedStripeError) => boolean;
    isRateLimitError: (error: StandardizedStripeError) => boolean;
    isInfrastructureError: (error: StandardizedStripeError) => boolean;
    isConfigurationError: (error: StandardizedStripeError) => boolean;
}
export interface StripeErrorMetrics {
    errorCount: number;
    errorRate: number;
    retryCount: number;
    successRate: number;
    averageResponseTime: number;
    errorsByCategory: Record<StripeErrorCategory, number>;
    errorsBySeverity: Record<StripeErrorSeverity, number>;
    topErrorCodes: {
        code: StripeErrorCode;
        count: number;
    }[];
}
export interface StripeErrorAlert {
    errorId: string;
    code: StripeErrorCode;
    category: StripeErrorCategory;
    severity: StripeErrorSeverity;
    message: string;
    operation: string;
    resource: string;
    timestamp: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    escalateToStripe: boolean;
    actionRequired: boolean;
}
export interface BackendStripeError extends StandardizedStripeError {
    originalError?: Error;
    stackTrace?: string;
    contextData?: Record<string, unknown>;
    processingTime?: number;
    retryHistory?: {
        attempt: number;
        timestamp: string;
        error: string;
    }[];
}
export interface StripeErrorDisplayInfo {
    title: string;
    message: string;
    actionText?: string;
    actionCallback?: () => void;
    showRetry: boolean;
    showSupport: boolean;
    severity: 'info' | 'warning' | 'error' | 'critical';
}
//# sourceMappingURL=stripe-unified.d.ts.map