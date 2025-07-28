/**
 * Error types for the application
 * Centralized error handling types for consistent error management
 */

// Base error interface
export interface BaseError {
  name?: string
  message: string
  code?: string
  statusCode?: number
  timestamp?: Date
  stack?: string
}

// Authentication errors
export interface AuthError extends BaseError {
  type: 'AUTH_ERROR'
  code: 
    | 'INVALID_CREDENTIALS'
    | 'TOKEN_EXPIRED'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'EMAIL_NOT_VERIFIED'
    | 'ACCOUNT_LOCKED'
    | 'INVALID_TOKEN'
}

// Validation errors
export interface ValidationError extends BaseError {
  type: 'VALIDATION_ERROR'
  code: 'VALIDATION_FAILED'
  field?: string
  errors?: string[]
}

// Network errors
export interface NetworkError extends BaseError {
  type: 'NETWORK_ERROR'
  code: 
    | 'CONNECTION_FAILED'
    | 'TIMEOUT'
    | 'NETWORK_UNREACHABLE'
    | 'REQUEST_ABORTED'
}

// Server errors
export interface ServerError extends BaseError {
  type: 'SERVER_ERROR'
  code: 
    | 'INTERNAL_ERROR'
    | 'SERVICE_UNAVAILABLE'
    | 'DATABASE_ERROR'
    | 'EXTERNAL_SERVICE_ERROR'
}

// Business logic errors
export interface BusinessError extends BaseError {
  type: 'BUSINESS_ERROR'
  code: 
    | 'RESOURCE_NOT_FOUND'
    | 'RESOURCE_ALREADY_EXISTS'
    | 'INSUFFICIENT_PERMISSIONS'
    | 'OPERATION_NOT_ALLOWED'
    | 'QUOTA_EXCEEDED'
    | 'SUBSCRIPTION_REQUIRED'
}

// File upload errors
export interface FileUploadError extends BaseError {
  type: 'FILE_UPLOAD_ERROR'
  code: 
    | 'FILE_TOO_LARGE'
    | 'INVALID_FILE_TYPE'
    | 'UPLOAD_FAILED'
    | 'STORAGE_QUOTA_EXCEEDED'
}


// Payment errors
export interface PaymentError extends BaseError {
  type: 'PAYMENT_ERROR'
  code: 
    | 'PAYMENT_FAILED'
    | 'INSUFFICIENT_FUNDS'
    | 'CARD_DECLINED'
    | 'PAYMENT_METHOD_INVALID'
    | 'STRIPE_ERROR'
}

// Union type for all possible errors
export type AppError = 
  | AuthError
  | ValidationError
  | NetworkError
  | ServerError
  | BusinessError
  | FileUploadError
  | PaymentError

// Error response from API
export interface ErrorResponse {
  success: false
  error: AppError
  requestId?: string
  timestamp: Date
}

// Success response type
export interface SuccessResponse<T = Record<string, string | number | boolean | null>> {
  success: true
  data: T
  message?: string
  requestId?: string
  timestamp: Date
}

// Generic API response
export type ApiResponse<T = Record<string, string | number | boolean | null>> = SuccessResponse<T> | ErrorResponse

// Error handler function type
export type ErrorHandler = (error: AppError) => void

// Error boundary props  
export interface ErrorBoundaryProps {
  fallback?: string | null
  onError?: ErrorHandler
  children: string | string[]
}

// Form error state
export interface FormErrorState {
  [field: string]: string | undefined
}

// Async operation result
export type AsyncResult<T> = {
  success: true
  data: T
} | {
  success: false
  error: AppError
}

// Error context for debugging
export interface ErrorContext {
  userId?: string
  component?: string
  action?: string
  additionalData?: Record<string, string | number | boolean | null>
}