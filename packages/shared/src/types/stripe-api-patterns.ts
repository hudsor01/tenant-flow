/**
 * Stripe API Patterns Type Definitions for TenantFlow
 * 
 * Type definitions for pagination, error handling, object expansion,
 * and response optimization patterns used in production Stripe integration.
 */

import {
  STRIPE_ERROR_TYPES,
  type StripeErrorType,
  CARD_DECLINE_CODES,
  type CardDeclineCode,
  type StripeError} from './stripe-errors'

// ========================
// Pagination Types
// ========================

/**
 * Generic Stripe list response structure
 */
export interface StripeList<T> {
  readonly object: 'list'
  readonly data: T[]
  readonly has_more: boolean
  readonly url: string
  readonly total_count?: number | null
}

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  readonly limit?: number              // 1-100, default 10
  readonly starting_after?: string     // Object ID cursor for forward pagination
  readonly ending_before?: string      // Object ID cursor for backward pagination
}

/**
 * Enhanced pagination parameters with date filtering
 */
export interface DateFilteredPaginationParams extends PaginationParams {
  readonly created?: {
    readonly gt?: number        // Greater than timestamp
    readonly gte?: number       // Greater than or equal timestamp
    readonly lt?: number        // Less than timestamp
    readonly lte?: number       // Less than or equal timestamp
  }
}

/**
 * Pagination configuration for auto-pagination
 */
export interface PaginationConfig {
  readonly pageSize: number           // Objects per page (1-100)
  readonly maxPages?: number          // Maximum pages to fetch (safety limit)
  readonly batchDelay?: number        // Delay between requests in ms
}

/**
 * Pagination result with metadata
 */
export interface PaginationResult<T> {
  readonly items: T[]
  readonly totalFetched: number
  readonly pagesFetched: number
  readonly hasMore: boolean
  readonly lastCursor?: string
}

// ========================
// Error Handling Types
// ========================

// Re-export error types from stripe-errors for convenience
export { STRIPE_ERROR_TYPES, type StripeErrorType, CARD_DECLINE_CODES, type CardDeclineCode }

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  REQUEST_FAILED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const

export type HttpStatusCode = typeof HTTP_STATUS_CODES[keyof typeof HTTP_STATUS_CODES]

// StripeError type is imported from stripe-errors.ts

/**
 * Error context for debugging and monitoring
 */
export interface ErrorContext {
  readonly operation: string
  readonly timestamp: string
  readonly userId?: string
  readonly organizationId?: string
  readonly correlationId?: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Structured error details for logging and monitoring
 */
export interface StripeErrorDetails {
  readonly operation: string
  readonly timestamp: string
  readonly context?: ErrorContext
  readonly stripeRequestId?: string
  readonly errorType: StripeErrorType
  readonly errorCode?: string
  readonly message: string
  readonly httpStatus?: HttpStatusCode
  readonly isRetryable: boolean
  readonly userMessage: string
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  readonly maxRetries: number
  readonly baseDelay: number          // Base delay in milliseconds
  readonly maxDelay: number           // Maximum delay in milliseconds
  readonly exponentialBase: number    // Base for exponential backoff
  readonly jitter: boolean           // Add random jitter to delays
}

/**
 * User-facing error response
 */
export interface UserErrorResponse {
  readonly success: false
  readonly error: {
    readonly type: 'payment_failed' | 'rate_limit' | 'validation' | 'system_error'
    readonly message: string
    readonly code?: string
    readonly canRetry?: boolean
    readonly retryAfter?: number      // Seconds to wait before retry
    readonly supportContact?: string
    readonly actionRequired?: string  // User action needed
  }
}

// ========================
// Object Expansion Types
// ========================

/**
 * Expansion parameters for API requests
 */
export interface ExpansionParams {
  readonly expand?: string[]
}

/**
 * Common expansion patterns for TenantFlow objects
 */
export const COMMON_EXPANSIONS = {
  // Subscription expansions
  SUBSCRIPTION_BASIC: ['customer', 'default_payment_method'],
  SUBSCRIPTION_DETAILED: [
    'customer',
    'default_payment_method',
    'latest_invoice',
    'items.data.price'
  ],
  SUBSCRIPTION_FULL: [
    'customer',
    'default_payment_method',
    'latest_invoice',
    'latest_invoice.payment_intent',
    'items.data.price',
    'items.data.price.product'
  ],

  // Invoice expansions
  INVOICE_BASIC: ['customer', 'subscription'],
  INVOICE_PAYMENT: [
    'customer',
    'payment_intent',
    'payment_intent.payment_method',
    'subscription'
  ],
  INVOICE_DETAILED: [
    'customer',
    'payment_intent',
    'payment_intent.payment_method',
    'subscription',
    'charge',
    'lines.data.price'
  ],

  // Customer expansions
  // Note: default_source removed - Sources API is deprecated, use invoice_settings.default_payment_method
  CUSTOMER_BASIC: [],
  CUSTOMER_SUBSCRIPTIONS: ['subscriptions'],
  CUSTOMER_DETAILED: [
    'subscriptions',
    'tax_ids'
  ],

  // Checkout session expansions
  CHECKOUT_BASIC: ['customer', 'payment_intent'],
  CHECKOUT_DETAILED: [
    'customer',
    'payment_intent',
    'payment_intent.payment_method',
    'subscription',
    'line_items'
  ],

  // Payment intent expansions
  PAYMENT_INTENT_BASIC: ['payment_method'],
  PAYMENT_INTENT_DETAILED: [
    'payment_method',
    'customer',
    'invoice',
    'charges.data'
  ]
} as const

/**
 * Expansion depth limits
 */
export const EXPANSION_LIMITS = {
  MAX_DEPTH: 4,                    // Maximum nesting depth
  RECOMMENDED_DEPTH: 2,            // Recommended depth for performance
  MAX_EXPANSIONS_PER_REQUEST: 10   // Recommended maximum expansions
} as const

// ========================
// Response Optimization Types
// ========================

/**
 * Include parameters for API v2 endpoints
 */
export interface IncludeParams {
  readonly include?: string[]
}

/**
 * Response optimization configuration
 */
export interface ResponseOptimization {
  readonly minimal: boolean         // Return minimal data
  readonly includeMetadata: boolean // Include metadata
  readonly expandCriticalOnly: boolean // Only expand essential fields
}

/**
 * Data fetching strategy
 */
export const FETCH_STRATEGIES = {
  MINIMAL: 'minimal',           // Minimal data for lists
  STANDARD: 'standard',         // Standard data for most operations
  DETAILED: 'detailed',         // Detailed data for specific views
  COMPREHENSIVE: 'comprehensive' // All available data
} as const

export type FetchStrategy = typeof FETCH_STRATEGIES[keyof typeof FETCH_STRATEGIES]

// ========================
// Service Configuration Types
// ========================

/**
 * Stripe service configuration
 */
export interface StripeServiceConfig {
  readonly apiKey: string
  readonly apiVersion: string
  readonly timeout: number
  readonly maxRetries: number
  readonly retryConfig: RetryConfig
  readonly paginationConfig: PaginationConfig
  readonly defaultExpansions: Record<string, string[]>
  readonly enableTelemetry: boolean
}

/**
 * Request context for operations
 */
export interface RequestContext {
  readonly userId?: string
  readonly organizationId?: string
  readonly correlationId: string
  readonly userAgent?: string
  readonly ipAddress?: string
  readonly source: 'api' | 'webhook' | 'scheduled' | 'admin'
}

/**
 * Operation result with metadata
 */
export interface OperationResult<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: StripeErrorDetails
  readonly metadata: {
    readonly operation: string
    readonly duration: number
    readonly requestId?: string
    readonly timestamp: string
  }
}

// ========================
// Utility Types
// ========================

/**
 * Type-safe pagination handler
 */
export type PaginationHandler<T> = (params: PaginationParams & Record<string, unknown>) => Promise<StripeList<T>>

/**
 * Generic list fetcher with pagination
 */
export type ListFetcher<T, P = Record<string, unknown>> = (params: P & PaginationParams) => Promise<StripeList<T>>

/**
 * Async iterator for paginated results
 */
export interface PaginatedIterator<T> {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>
}

// ========================
// Utility Functions
// ========================

/**
 * Check if error is retryable
 */
export function isRetryableError(error: StripeError): boolean {
  const retryableTypes: StripeErrorType[] = [
    STRIPE_ERROR_TYPES.API_ERROR,
    STRIPE_ERROR_TYPES.RATE_LIMIT_ERROR
  ]
  
  const retryableCardCodes: CardDeclineCode[] = [
    CARD_DECLINE_CODES.PROCESSING_ERROR,
    CARD_DECLINE_CODES.TRY_AGAIN_LATER
  ]
  
  if (retryableTypes.includes(error.type)) {
    return true
  }
  
  if (error.type === STRIPE_ERROR_TYPES.CARD_ERROR && error.code) {
    return retryableCardCodes.includes(error.code as CardDeclineCode)
  }
  
  return false
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: StripeError): string {
  switch (error.type) {
    case STRIPE_ERROR_TYPES.CARD_ERROR:
      return getCardErrorMessage(error.code as CardDeclineCode)
    case STRIPE_ERROR_TYPES.RATE_LIMIT_ERROR:
      return 'Too many requests. Please wait a moment and try again.'
    case STRIPE_ERROR_TYPES.AUTHENTICATION_ERROR:
      return 'Authentication failed. Please contact support.'
    case STRIPE_ERROR_TYPES.INVALID_REQUEST_ERROR:
      return 'Invalid request. Please check your input and try again.'
    case STRIPE_ERROR_TYPES.API_ERROR:
      return 'Service temporarily unavailable. Please try again later.'
    case STRIPE_ERROR_TYPES.IDEMPOTENCY_ERROR:
      return 'Request conflict. Please try again with a new request.'
    default:
      return 'An unexpected error occurred. Please try again or contact support.'
  }
}

/**
 * Get card-specific error message
 */
export function getCardErrorMessage(code?: CardDeclineCode): string {
  switch (code) {
    case "expired_card":
      return "Your card has expired. Please use a different payment method.";
    case "insufficient_funds":
      return "Insufficient funds. Please use a different payment method.";
    case "incorrect_cvc":
      return "Your card's security code is incorrect.";
    case "incorrect_number":
      return "Your card number is incorrect.";
    case "incorrect_zip":
      return "Your postal code is incorrect.";
    case "invalid_cvc":
      return "Your card's security code is invalid.";
    case "invalid_expiry_month":
      return "Your card's expiration month is invalid.";
    case "invalid_expiry_year":
      return "Your card's expiration year is invalid.";
    case "invalid_number":
      return "Your card number is invalid.";
    case "processing_error":
      return "An error occurred while processing your card. Please try again.";
    case "try_again_later":
      return "Please try again later.";
    case "generic_decline":
      return "Your card was declined. Please try a different payment method.";
    default:
      return "Your payment could not be processed. Please try a different payment method.";
  }
}

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.exponentialBase, attempt),
    config.maxDelay
  )
  
  if (config.jitter) {
    return delay + Math.random() * 1000
  }
  
  return delay
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): void {
  if (params.limit !== undefined) {
    if (params.limit < 1 || params.limit > 100) {
      throw new Error('Limit must be between 1 and 100')
    }
  }
  
  if (params.starting_after && params.ending_before) {
    throw new Error('Cannot use both starting_after and ending_before')
  }
}

/**
 * Validate expansion parameters
 */
export function validateExpansionParams(expand: string[]): void {
  const maxDepth = EXPANSION_LIMITS.MAX_DEPTH
  const maxExpansions = EXPANSION_LIMITS.MAX_EXPANSIONS_PER_REQUEST
  
  if (expand.length > maxExpansions) {
    throw new Error(`Too many expansions (max: ${maxExpansions})`)
  }
  
  for (const expansion of expand) {
    const depth = expansion.split('.').length
    if (depth > maxDepth) {
      throw new Error(`Expansion too deep (max depth: ${maxDepth}): ${expansion}`)
    }
  }
}

/**
 * Create error context for operations
 */
export function createErrorContext(
  operation: string,
  requestContext?: Partial<RequestContext>,
  metadata?: Record<string, unknown>
): ErrorContext {
  return {
    operation,
    timestamp: new Date().toISOString(),
    userId: requestContext?.userId,
    organizationId: requestContext?.organizationId,
    correlationId: requestContext?.correlationId || generateCorrelationId(),
    metadata
  }
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `tf_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Check if HTTP status indicates success
 */
export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

/**
 * Check if HTTP status indicates client error
 */
export function isClientError(status: number): boolean {
  return status >= 400 && status < 500
}

/**
 * Check if HTTP status indicates server error
 */
export function isServerError(status: number): boolean {
  return status >= 500 && status < 600
}
