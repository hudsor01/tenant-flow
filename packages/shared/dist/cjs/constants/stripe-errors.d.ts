/**
 * Standardized Stripe Error Constants
 *
 * Centralized error codes and messages for consistent error handling across the application.
 * Following Stripe's official error documentation and best practices.
 */
/**
 * Stripe API error types as defined by Stripe SDK
 */
export declare const STRIPE_ERROR_TYPES: {
    readonly CARD_ERROR: "StripeCardError";
    readonly RATE_LIMIT_ERROR: "StripeRateLimitError";
    readonly INVALID_REQUEST_ERROR: "StripeInvalidRequestError";
    readonly API_ERROR: "StripeAPIError";
    readonly CONNECTION_ERROR: "StripeConnectionError";
    readonly AUTHENTICATION_ERROR: "StripeAuthenticationError";
    readonly PERMISSION_ERROR: "StripePermissionError";
    readonly IDEMPOTENCY_ERROR: "StripeIdempotencyError";
    readonly SIGNATURE_VERIFICATION_ERROR: "StripeSignatureVerificationError";
};
/**
 * Application-specific Stripe error codes
 */
export declare const STRIPE_ERROR_CODES: {
    readonly CARD_DECLINED: "card_declined";
    readonly EXPIRED_CARD: "expired_card";
    readonly INCORRECT_CVC: "incorrect_cvc";
    readonly INCORRECT_NUMBER: "incorrect_number";
    readonly INSUFFICIENT_FUNDS: "insufficient_funds";
    readonly INVALID_EXPIRY: "invalid_expiry";
    readonly INVALID_NUMBER: "invalid_number";
    readonly PROCESSING_ERROR: "processing_error";
    readonly RATE_LIMIT: "rate_limit";
    readonly INVALID_REQUEST: "invalid_request_error";
    readonly MISSING_PARAMETER: "missing";
    readonly INVALID_PARAMETER: "invalid";
    readonly API_CONNECTION_ERROR: "api_connection_error";
    readonly API_ERROR: "api_error";
    readonly AUTHENTICATION_ERROR: "authentication_error";
    readonly PERMISSION_ERROR: "permission_error";
    readonly IDEMPOTENCY_ERROR: "idempotency_error";
    readonly CUSTOMER_NOT_FOUND: "customer_not_found";
    readonly SUBSCRIPTION_NOT_FOUND: "subscription_not_found";
    readonly INVALID_PRICE_ID: "invalid_price_id";
    readonly WEBHOOK_SIGNATURE_INVALID: "webhook_signature_invalid";
    readonly CONFIGURATION_ERROR: "configuration_error";
    readonly NETWORK_ERROR: "network_error";
    readonly TIMEOUT_ERROR: "timeout_error";
    readonly UNKNOWN_ERROR: "unknown_error";
};
/**
 * User-friendly error messages mapped to error codes
 */
export declare const STRIPE_ERROR_MESSAGES: {
    readonly card_declined: "Your card was declined. Please try a different payment method or contact your bank.";
    readonly expired_card: "Your card has expired. Please use a different payment method.";
    readonly incorrect_cvc: "Your card's security code is incorrect. Please check and try again.";
    readonly incorrect_number: "Your card number is incorrect. Please check and try again.";
    readonly insufficient_funds: "Your card has insufficient funds. Please try a different payment method.";
    readonly invalid_expiry: "Your card's expiration date is invalid. Please check and try again.";
    readonly invalid_number: "Your card number is invalid. Please check and try again.";
    readonly processing_error: "There was an error processing your card. Please try again.";
    readonly rate_limit: "Too many requests. Please wait a moment and try again.";
    readonly invalid_request_error: "The request contains invalid information. Please contact support if this persists.";
    readonly missing: "Required information is missing. Please fill in all required fields.";
    readonly invalid: "Some information is invalid. Please check your input and try again.";
    readonly api_connection_error: "Connection error. Please check your internet connection and try again.";
    readonly api_error: "Payment processing temporarily unavailable. Please try again in a few moments.";
    readonly authentication_error: "Service authentication error. Please contact support.";
    readonly permission_error: "This operation is not permitted. Please contact support.";
    readonly idempotency_error: "Duplicate request detected. Please refresh and try again.";
    readonly customer_not_found: "Customer information not found. Please contact support.";
    readonly subscription_not_found: "Subscription not found. Please contact support.";
    readonly invalid_price_id: "Invalid pricing information. Please contact support.";
    readonly webhook_signature_invalid: "Invalid webhook signature. Please check your configuration.";
    readonly configuration_error: "Service configuration error. Please contact support.";
    readonly network_error: "Network connection error. Please check your internet connection and try again.";
    readonly timeout_error: "Request timed out. Please try again.";
    readonly unknown_error: "An unexpected error occurred. Please contact support if this persists.";
};
/**
 * Stripe decline codes with user-friendly messages
 */
export declare const STRIPE_DECLINE_MESSAGES: {
    readonly generic_decline: "Your card was declined. Please contact your bank or try a different payment method.";
    readonly insufficient_funds: "Your card has insufficient funds. Please try a different payment method.";
    readonly lost_card: "Your card has been reported as lost. Please contact your bank.";
    readonly stolen_card: "Your card has been reported as stolen. Please contact your bank.";
    readonly expired_card: "Your card has expired. Please use a different payment method.";
    readonly incorrect_cvc: "Your card's security code is incorrect. Please check and try again.";
    readonly processing_error: "There was an error processing your card. Please try again.";
    readonly card_not_supported: "This card type is not supported. Please try a different payment method.";
    readonly currency_not_supported: "Your card doesn't support this currency. Please try a different payment method.";
    readonly fraudulent: "This transaction appears fraudulent. Please contact your bank.";
    readonly merchant_blacklist: "Your card cannot be used with this merchant. Please try a different payment method.";
    readonly pickup_card: "Your card cannot be used. Please contact your bank.";
    readonly restricted_card: "Your card has restrictions. Please contact your bank.";
    readonly security_violation: "Security violation detected. Please contact your bank.";
    readonly service_not_allowed: "This service is not allowed on your card. Please try a different payment method.";
    readonly stop_payment_order: "A stop payment order exists on your card. Please contact your bank.";
    readonly testmode_decline: "Your card was declined (test mode).";
    readonly transaction_not_allowed: "This transaction is not allowed on your card. Please contact your bank.";
    readonly try_again_later: "Please try again later.";
    readonly withdrawal_count_limit_exceeded: "Withdrawal limit exceeded. Please try again later.";
};
/**
 * Error categories for monitoring and analytics
 */
export declare const STRIPE_ERROR_CATEGORIES: {
    readonly PAYMENT_METHOD: "payment_method";
    readonly INFRASTRUCTURE: "infrastructure";
    readonly CLIENT_ERROR: "client_error";
    readonly STRIPE_SERVICE: "stripe_service";
    readonly CONFIGURATION: "configuration";
    readonly UNKNOWN: "unknown";
};
/**
 * Error severity levels for alerting
 */
export declare const STRIPE_ERROR_SEVERITIES: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly CRITICAL: "critical";
};
/**
 * Retryable error codes
 */
export declare const RETRYABLE_ERROR_CODES: Set<"processing_error" | "rate_limit" | "api_connection_error" | "api_error" | "network_error" | "timeout_error">;
/**
 * Default retry configuration
 */
export declare const DEFAULT_STRIPE_RETRY_CONFIG: {
    readonly maxAttempts: 3;
    readonly baseDelayMs: 1000;
    readonly maxDelayMs: 10000;
    readonly exponentialBase: 2;
    readonly jitterMs: 100;
};
/**
 * Error code to category mapping
 */
export declare const ERROR_CATEGORY_MAP: {
    readonly card_declined: "payment_method";
    readonly expired_card: "payment_method";
    readonly incorrect_cvc: "payment_method";
    readonly incorrect_number: "payment_method";
    readonly insufficient_funds: "payment_method";
    readonly invalid_expiry: "payment_method";
    readonly invalid_number: "payment_method";
    readonly processing_error: "payment_method";
    readonly rate_limit: "infrastructure";
    readonly api_connection_error: "infrastructure";
    readonly network_error: "infrastructure";
    readonly timeout_error: "infrastructure";
    readonly invalid_request_error: "client_error";
    readonly missing: "client_error";
    readonly invalid: "client_error";
    readonly idempotency_error: "client_error";
    readonly customer_not_found: "client_error";
    readonly subscription_not_found: "client_error";
    readonly invalid_price_id: "client_error";
    readonly api_error: "stripe_service";
    readonly authentication_error: "configuration";
    readonly permission_error: "configuration";
    readonly webhook_signature_invalid: "configuration";
    readonly configuration_error: "configuration";
    readonly unknown_error: "unknown";
};
/**
 * Error code to severity mapping
 */
export declare const ERROR_SEVERITY_MAP: {
    readonly card_declined: "low";
    readonly expired_card: "low";
    readonly incorrect_cvc: "low";
    readonly incorrect_number: "low";
    readonly insufficient_funds: "low";
    readonly invalid_expiry: "low";
    readonly invalid_number: "low";
    readonly processing_error: "medium";
    readonly rate_limit: "medium";
    readonly api_connection_error: "high";
    readonly network_error: "medium";
    readonly timeout_error: "medium";
    readonly invalid_request_error: "medium";
    readonly missing: "medium";
    readonly invalid: "medium";
    readonly idempotency_error: "medium";
    readonly customer_not_found: "medium";
    readonly subscription_not_found: "medium";
    readonly invalid_price_id: "high";
    readonly api_error: "high";
    readonly authentication_error: "critical";
    readonly permission_error: "critical";
    readonly webhook_signature_invalid: "critical";
    readonly configuration_error: "critical";
    readonly unknown_error: "high";
};
export type StripeErrorType = typeof STRIPE_ERROR_TYPES[keyof typeof STRIPE_ERROR_TYPES];
export type StripeErrorCode = typeof STRIPE_ERROR_CODES[keyof typeof STRIPE_ERROR_CODES];
export type StripeErrorCategory = typeof STRIPE_ERROR_CATEGORIES[keyof typeof STRIPE_ERROR_CATEGORIES];
export type StripeErrorSeverity = typeof STRIPE_ERROR_SEVERITIES[keyof typeof STRIPE_ERROR_SEVERITIES];
export type StripeDeclineCode = keyof typeof STRIPE_DECLINE_MESSAGES;
//# sourceMappingURL=stripe-errors.d.ts.map