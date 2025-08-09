/**
 * Unified Stripe Error Handling Types
 * 
 * Comprehensive type definitions for the unified Stripe error handling system.
 * These types provide consistent error handling patterns across frontend and backend.
 */

// Import consolidated types from stripe.ts
import type { 
  StandardizedStripeError,
  StripeErrorCode,
  StripeErrorCategory,
  StripeErrorSeverity,
  StripeRetryConfig
} from './stripe'

// Core error interfaces matching the enhanced error handler
export interface StripeErrorContext {
    operation: string
    resource: string
    metadata?: Record<string, unknown>
    userId?: string
    requestId?: string
}


export type RetryConfig = StripeRetryConfig

// Use consolidated types from stripe.ts - no need to redefine

export interface StripeErrorAnalytics {
    category: StripeErrorCategory
    severity: StripeErrorSeverity
    actionRequired: boolean
    escalateToStripe: boolean
}

// Use StripeErrorCode from consolidated stripe.ts

// Specific card error decline codes for detailed handling
export type StripeDeclineCode = 
    | 'insufficient_funds'
    | 'card_declined'
    | 'expired_card'
    | 'incorrect_cvc'
    | 'processing_error'
    | 'card_not_supported'
    | 'currency_not_supported'
    | 'lost_card'
    | 'stolen_card'
    | 'generic_decline'
    | 'fraudulent'
    | 'merchant_blacklist'
    | 'pickup_card'
    | 'restricted_card'
    | 'revocation_of_all_authorizations'
    | 'revocation_of_authorization'
    | 'security_violation'
    | 'service_not_allowed'
    | 'stop_payment_order'
    | 'testmode_decline'
    | 'transaction_not_allowed'
    | 'try_again_later'
    | 'withdrawal_count_limit_exceeded'

// Enhanced error response for API endpoints
export interface StripeErrorResponse {
    success: false
    error: {
        code: StripeErrorCode
        message: string
        userMessage: string
        errorId: string
        details?: string
        retryable: boolean
        retryAfter?: number // seconds to wait before retry
        analytics?: StripeErrorAnalytics
    }
    metadata?: {
        requestId?: string
        timestamp: string
        operation: string
        resource: string
    }
}

// Success response wrapper for consistency
export interface StripeSuccessResponse<T = unknown> {
    success: true
    data: T
    metadata?: {
        requestId?: string
        timestamp: string
        operation: string
        resource: string
    }
}

// Union type for all API responses
export type StripeApiResponse<T = unknown> = StripeSuccessResponse<T> | StripeErrorResponse

// Frontend-safe error interface (no sensitive details)
export interface ClientSafeStripeError {
    code: StripeErrorCode
    userMessage: string
    retryable: boolean
    retryAfter?: number
    errorId: string
    category: StripeErrorCategory
    severity: StripeErrorSeverity
}

// Error handler configuration
export interface StripeErrorHandlerConfig {
    defaultRetryConfig: RetryConfig
    enableAnalytics: boolean
    enableDetailedLogging: boolean
    customErrorMessages?: Partial<Record<StripeErrorCode, string>>
}

// Webhook error handling types
export interface StripeWebhookError extends StandardizedStripeError {
    webhookEventId?: string
    webhookEventType?: string
    processingAttempt: number
}

// Payment method error details
export interface PaymentMethodError {
    code: StripeErrorCode
    declineCode?: StripeDeclineCode
    userMessage: string
    retryable: boolean
    suggestedActions: string[]
}

// Subscription error context
export interface SubscriptionErrorContext extends StripeErrorContext {
    subscriptionId?: string
    customerId?: string
    priceId?: string
    planType?: string
}

// Billing error context
export interface BillingErrorContext extends StripeErrorContext {
    amount?: number
    currency?: string
    invoiceId?: string
    paymentIntentId?: string
}

// Export utility functions type definitions
export interface StripeErrorUtils {
    isRetryableError: (error: StandardizedStripeError) => boolean
    getRetryDelay: (attemptCount: number, config?: Partial<RetryConfig>) => number
    categorizeError: (code: StripeErrorCode) => StripeErrorCategory
    getSeverity: (code: StripeErrorCode) => StripeErrorSeverity
    toClientSafeError: (error: StandardizedStripeError) => ClientSafeStripeError
    getAnalytics: (error: StandardizedStripeError) => StripeErrorAnalytics
}

// Constants for error handling
export const STRIPE_ERROR_CONSTANTS = {
    DEFAULT_RETRY_ATTEMPTS: 3,
    DEFAULT_BASE_DELAY_MS: 1000,
    DEFAULT_MAX_DELAY_MS: 10000,
    DEFAULT_EXPONENTIAL_BASE: 2,
    DEFAULT_JITTER_MS: 100,
    
    RETRYABLE_ERROR_CODES: [
        'RATE_LIMIT_ERROR',
        'API_ERROR',
        'CONNECTION_ERROR',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR'
    ] as const,
    
    CRITICAL_ERROR_CODES: [
        'AUTHENTICATION_ERROR',
        'PERMISSION_ERROR'
    ] as const,
    
    CLIENT_ERROR_CODES: [
        'CARD_ERROR',
        'INVALID_REQUEST',
        'IDEMPOTENCY_ERROR'
    ] as const
} as const

// Type guards for error classification
export interface StripeErrorTypeGuards {
    isStripeError: (error: unknown) => error is StandardizedStripeError
    isRetryableError: (error: StandardizedStripeError) => boolean
    isCardError: (error: StandardizedStripeError) => boolean
    isRateLimitError: (error: StandardizedStripeError) => boolean
    isInfrastructureError: (error: StandardizedStripeError) => boolean
    isConfigurationError: (error: StandardizedStripeError) => boolean
}

// Monitoring and alerting types
export interface StripeErrorMetrics {
    errorCount: number
    errorRate: number
    retryCount: number
    successRate: number
    averageResponseTime: number
    errorsByCategory: Record<StripeErrorCategory, number>
    errorsBySeverity: Record<StripeErrorSeverity, number>
    topErrorCodes: { code: StripeErrorCode; count: number }[]
}

export interface StripeErrorAlert {
    errorId: string
    code: StripeErrorCode
    category: StripeErrorCategory
    severity: StripeErrorSeverity
    message: string
    operation: string
    resource: string
    timestamp: string
    userId?: string
    metadata?: Record<string, unknown>
    escalateToStripe: boolean
    actionRequired: boolean
}

// Enhanced error for backend processing
export interface BackendStripeError extends StandardizedStripeError {
    originalError?: Error
    stackTrace?: string
    contextData?: Record<string, unknown>
    processingTime?: number
    retryHistory?: {
        attempt: number
        timestamp: string
        error: string
    }[]
}

// Frontend error display types
export interface StripeErrorDisplayInfo {
    title: string
    message: string
    actionText?: string
    actionCallback?: () => void
    showRetry: boolean
    showSupport: boolean
    severity: 'info' | 'warning' | 'error' | 'critical'
}