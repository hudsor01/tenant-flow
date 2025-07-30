/**
 * Standardized Stripe Error Constants
 * 
 * Centralized error codes and messages for consistent error handling across the application.
 * Following Stripe's official error documentation and best practices.
 */

/**
 * Stripe API error types as defined by Stripe SDK
 */
export const STRIPE_ERROR_TYPES = {
  CARD_ERROR: 'StripeCardError',
  RATE_LIMIT_ERROR: 'StripeRateLimitError',
  INVALID_REQUEST_ERROR: 'StripeInvalidRequestError',
  API_ERROR: 'StripeAPIError',
  CONNECTION_ERROR: 'StripeConnectionError',
  AUTHENTICATION_ERROR: 'StripeAuthenticationError',
  PERMISSION_ERROR: 'StripePermissionError',
  IDEMPOTENCY_ERROR: 'StripeIdempotencyError',
  SIGNATURE_VERIFICATION_ERROR: 'StripeSignatureVerificationError'
} as const

/**
 * Application-specific Stripe error codes
 */
export const STRIPE_ERROR_CODES = {
  // Card Errors
  CARD_DECLINED: 'card_declined',
  EXPIRED_CARD: 'expired_card',
  INCORRECT_CVC: 'incorrect_cvc',
  INCORRECT_NUMBER: 'incorrect_number',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INVALID_EXPIRY: 'invalid_expiry',
  INVALID_NUMBER: 'invalid_number',
  PROCESSING_ERROR: 'processing_error',
  
  // Rate Limit Errors
  RATE_LIMIT: 'rate_limit',
  
  // Invalid Request Errors
  INVALID_REQUEST: 'invalid_request_error',
  MISSING_PARAMETER: 'missing',
  INVALID_PARAMETER: 'invalid',
  
  // API Errors
  API_CONNECTION_ERROR: 'api_connection_error',
  API_ERROR: 'api_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  PERMISSION_ERROR: 'permission_error',
  IDEMPOTENCY_ERROR: 'idempotency_error',
  
  // Application Errors
  CUSTOMER_NOT_FOUND: 'customer_not_found',
  SUBSCRIPTION_NOT_FOUND: 'subscription_not_found',
  INVALID_PRICE_ID: 'invalid_price_id',
  WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
  CONFIGURATION_ERROR: 'configuration_error',
  
  // Network Errors
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const

/**
 * User-friendly error messages mapped to error codes
 */
export const STRIPE_ERROR_MESSAGES = {
  // Card Errors
  [STRIPE_ERROR_CODES.CARD_DECLINED]: 'Your card was declined. Please try a different payment method or contact your bank.',
  [STRIPE_ERROR_CODES.EXPIRED_CARD]: 'Your card has expired. Please use a different payment method.',
  [STRIPE_ERROR_CODES.INCORRECT_CVC]: 'Your card\'s security code is incorrect. Please check and try again.',
  [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: 'Your card number is incorrect. Please check and try again.',
  [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: 'Your card has insufficient funds. Please try a different payment method.',
  [STRIPE_ERROR_CODES.INVALID_EXPIRY]: 'Your card\'s expiration date is invalid. Please check and try again.',
  [STRIPE_ERROR_CODES.INVALID_NUMBER]: 'Your card number is invalid. Please check and try again.',
  [STRIPE_ERROR_CODES.PROCESSING_ERROR]: 'There was an error processing your card. Please try again.',
  
  // Rate Limit Errors
  [STRIPE_ERROR_CODES.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
  
  // Invalid Request Errors
  [STRIPE_ERROR_CODES.INVALID_REQUEST]: 'The request contains invalid information. Please contact support if this persists.',
  [STRIPE_ERROR_CODES.MISSING_PARAMETER]: 'Required information is missing. Please fill in all required fields.',
  [STRIPE_ERROR_CODES.INVALID_PARAMETER]: 'Some information is invalid. Please check your input and try again.',
  
  // API Errors
  [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: 'Connection error. Please check your internet connection and try again.',
  [STRIPE_ERROR_CODES.API_ERROR]: 'Payment processing temporarily unavailable. Please try again in a few moments.',
  [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: 'Service authentication error. Please contact support.',
  [STRIPE_ERROR_CODES.PERMISSION_ERROR]: 'This operation is not permitted. Please contact support.',
  [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: 'Duplicate request detected. Please refresh and try again.',
  
  // Application Errors
  [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: 'Customer information not found. Please contact support.',
  [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: 'Subscription not found. Please contact support.',
  [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: 'Invalid pricing information. Please contact support.',
  [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: 'Invalid webhook signature. Please check your configuration.',
  [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: 'Service configuration error. Please contact support.',
  
  // Network Errors
  [STRIPE_ERROR_CODES.NETWORK_ERROR]: 'Network connection error. Please check your internet connection and try again.',
  [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please contact support if this persists.'
} as const

/**
 * Stripe decline codes with user-friendly messages
 */
export const STRIPE_DECLINE_MESSAGES = {
  'generic_decline': 'Your card was declined. Please contact your bank or try a different payment method.',
  'insufficient_funds': 'Your card has insufficient funds. Please try a different payment method.',
  'lost_card': 'Your card has been reported as lost. Please contact your bank.',
  'stolen_card': 'Your card has been reported as stolen. Please contact your bank.',
  'expired_card': 'Your card has expired. Please use a different payment method.',
  'incorrect_cvc': 'Your card\'s security code is incorrect. Please check and try again.',
  'processing_error': 'There was an error processing your card. Please try again.',
  'card_not_supported': 'This card type is not supported. Please try a different payment method.',
  'currency_not_supported': 'Your card doesn\'t support this currency. Please try a different payment method.',
  'fraudulent': 'This transaction appears fraudulent. Please contact your bank.',
  'merchant_blacklist': 'Your card cannot be used with this merchant. Please try a different payment method.',
  'pickup_card': 'Your card cannot be used. Please contact your bank.',
  'restricted_card': 'Your card has restrictions. Please contact your bank.',
  'security_violation': 'Security violation detected. Please contact your bank.',
  'service_not_allowed': 'This service is not allowed on your card. Please try a different payment method.',
  'stop_payment_order': 'A stop payment order exists on your card. Please contact your bank.',
  'testmode_decline': 'Your card was declined (test mode).',
  'transaction_not_allowed': 'This transaction is not allowed on your card. Please contact your bank.',
  'try_again_later': 'Please try again later.',
  'withdrawal_count_limit_exceeded': 'Withdrawal limit exceeded. Please try again later.'
} as const

/**
 * Error categories for monitoring and analytics
 */
export const STRIPE_ERROR_CATEGORIES = {
  PAYMENT_METHOD: 'payment_method',
  INFRASTRUCTURE: 'infrastructure',
  CLIENT_ERROR: 'client_error',
  STRIPE_SERVICE: 'stripe_service',
  CONFIGURATION: 'configuration',
  UNKNOWN: 'unknown'
} as const

/**
 * Error severity levels for alerting
 */
export const STRIPE_ERROR_SEVERITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

/**
 * Retryable error codes
 */
export const RETRYABLE_ERROR_CODES = new Set([
  STRIPE_ERROR_CODES.RATE_LIMIT,
  STRIPE_ERROR_CODES.API_ERROR,
  STRIPE_ERROR_CODES.API_CONNECTION_ERROR,
  STRIPE_ERROR_CODES.PROCESSING_ERROR,
  STRIPE_ERROR_CODES.NETWORK_ERROR,
  STRIPE_ERROR_CODES.TIMEOUT_ERROR
])

/**
 * Default retry configuration
 */
export const DEFAULT_STRIPE_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBase: 2,
  jitterMs: 100
} as const

/**
 * Error code to category mapping
 */
export const ERROR_CATEGORY_MAP = {
  [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_CATEGORIES.PAYMENT_METHOD,
  
  [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  [STRIPE_ERROR_CODES.NETWORK_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: STRIPE_ERROR_CATEGORIES.INFRASTRUCTURE,
  
  [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_CATEGORIES.CLIENT_ERROR,
  
  [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_CATEGORIES.STRIPE_SERVICE,
  
  [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_CATEGORIES.CONFIGURATION,
  
  [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: STRIPE_ERROR_CATEGORIES.UNKNOWN
} as const

/**
 * Error code to severity mapping
 */
export const ERROR_SEVERITY_MAP = {
  [STRIPE_ERROR_CODES.CARD_DECLINED]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.EXPIRED_CARD]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INCORRECT_CVC]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INCORRECT_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INSUFFICIENT_FUNDS]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INVALID_EXPIRY]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.INVALID_NUMBER]: STRIPE_ERROR_SEVERITIES.LOW,
  [STRIPE_ERROR_CODES.PROCESSING_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  
  [STRIPE_ERROR_CODES.RATE_LIMIT]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.API_CONNECTION_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
  [STRIPE_ERROR_CODES.NETWORK_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.TIMEOUT_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  
  [STRIPE_ERROR_CODES.INVALID_REQUEST]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.MISSING_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.INVALID_PARAMETER]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.IDEMPOTENCY_ERROR]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.CUSTOMER_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.SUBSCRIPTION_NOT_FOUND]: STRIPE_ERROR_SEVERITIES.MEDIUM,
  [STRIPE_ERROR_CODES.INVALID_PRICE_ID]: STRIPE_ERROR_SEVERITIES.HIGH,
  
  [STRIPE_ERROR_CODES.API_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH,
  
  [STRIPE_ERROR_CODES.AUTHENTICATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.PERMISSION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.WEBHOOK_SIGNATURE_INVALID]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  [STRIPE_ERROR_CODES.CONFIGURATION_ERROR]: STRIPE_ERROR_SEVERITIES.CRITICAL,
  
  [STRIPE_ERROR_CODES.UNKNOWN_ERROR]: STRIPE_ERROR_SEVERITIES.HIGH
} as const

// Type exports
export type StripeErrorType = typeof STRIPE_ERROR_TYPES[keyof typeof STRIPE_ERROR_TYPES]
export type StripeErrorCode = typeof STRIPE_ERROR_CODES[keyof typeof STRIPE_ERROR_CODES]
export type StripeErrorCategory = typeof STRIPE_ERROR_CATEGORIES[keyof typeof STRIPE_ERROR_CATEGORIES]
export type StripeErrorSeverity = typeof STRIPE_ERROR_SEVERITIES[keyof typeof STRIPE_ERROR_SEVERITIES]
export type StripeDeclineCode = keyof typeof STRIPE_DECLINE_MESSAGES