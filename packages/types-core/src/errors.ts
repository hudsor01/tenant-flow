/**
 * Error Handling Types
 * Centralized type definitions for error handling and logging
 */

// Base app error interface
export interface AppError extends Error {
  name: string
  code: string
  statusCode: number
  context?: Record<string, unknown>
  type?: string
  timestamp?: Date
  field?: string
  errors?: unknown
}

// Error context interface
export interface ErrorContext {
  operation?: string
  userId?: string
  resource?: string
  metadata?: Record<string, string | number | boolean | null | undefined | Record<string, string | number | boolean | null>>
  [key: string]: unknown
}

// Specific error types
export interface AuthError extends AppError {
  type: 'AUTH_ERROR'
}

export interface ValidationError extends AppError {
  type: 'VALIDATION_ERROR'
  field?: string
  errors?: string[]
}

export interface BusinessError extends AppError {
  type: 'BUSINESS_ERROR'
}

export interface ServerError extends AppError {
  type: 'SERVER_ERROR'
}

export interface PaymentError extends AppError {
  type: 'PAYMENT_ERROR'
}

export interface NetworkError extends AppError {
  type: 'NETWORK_ERROR'
}

export interface FileUploadError extends AppError {
  type: 'FILE_UPLOAD_ERROR'
  maxSize?: number
  allowedTypes?: string[]
}

// Base error interface for backward compatibility
export interface BaseError {
  message: string
  code?: string
  statusCode?: number
}

// Error code enums
export const ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Business logic errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',

  // Server errors
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Payment errors
  STRIPE_ERROR: 'STRIPE_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_DECLINED: 'CARD_DECLINED',
  PAYMENT_METHOD_INVALID: 'PAYMENT_METHOD_INVALID'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]