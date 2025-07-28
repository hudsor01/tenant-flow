import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import type { AppError } from '@tenantflow/shared/dist/types/errors'

/**
 * Unified error handler that works with both NestJS and Hono
 * Provides consistent error formatting and HTTP status mapping
 */

export interface UnifiedErrorContext {
  operation?: string
  resource?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface UnifiedError extends Error {
  code?: string
  type?: string
  statusCode?: number
  context?: UnifiedErrorContext
  fields?: Record<string, string>
}

/**
 * Maps error messages to appropriate HTTP status codes
 */
export function getHttpStatusFromError(error: Error | UnifiedError | AppError): number {
  // Check for explicit status code
  if ('statusCode' in error && error.statusCode) {
    return error.statusCode
  }

  // Check for error code
  if ('code' in error && error.code) {
    const codeMap: Record<string, number> = {
      'BAD_REQUEST': 400,
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'CONFLICT': 409,
      'UNPROCESSABLE_ENTITY': 422,
      'PAYMENT_REQUIRED': 402,
      'INTERNAL_SERVER_ERROR': 500,
      'SERVICE_UNAVAILABLE': 503
    }
    
    const status = codeMap[error.code]
    if (status) return status
  }

  // Message-based detection
  const message = error.message.toLowerCase()
  
  if (message.includes('not found') || message.includes('does not exist')) {
    return 404
  }
  
  if (message.includes('already exists') || message.includes('duplicate')) {
    return 409
  }
  
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 401
  }
  
  if (message.includes('forbidden') || message.includes('permission') || message.includes('not authorized')) {
    return 403
  }
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 400
  }
  
  if (message.includes('payment')) {
    return 402
  }

  // Default to 500
  return 500
}

/**
 * Converts any error into a UnifiedError with proper metadata
 */
export function createUnifiedError(
  error: Error | AppError | unknown,
  context?: UnifiedErrorContext
): UnifiedError {
  if (error instanceof Error) {
    const unifiedError = error as UnifiedError
    unifiedError.context = { ...unifiedError.context, ...context }
    return unifiedError
  }

  // Convert non-Error objects
  const errorObj = error as { message?: string; code?: string; type?: string; statusCode?: number }
  const unifiedError = new Error(errorObj.message || 'Unknown error') as UnifiedError
  unifiedError.code = errorObj.code
  unifiedError.type = errorObj.type
  unifiedError.statusCode = errorObj.statusCode
  unifiedError.context = context
  
  return unifiedError
}

/**
 * Creates a standardized error response object
 */
export function createErrorResponse(error: UnifiedError) {
  return {
    success: false,
    error: {
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      type: error.type,
      timestamp: new Date().toISOString(),
      ...(error.fields && { fields: error.fields }),
      ...(error.context && { context: error.context })
    }
  }
}

/**
 * Hono-specific error handler
 */
export function handleHonoError(error: unknown, c: Context): never {
  // If it's already an HTTPException, re-throw it
  if (error instanceof HTTPException) {
    throw error
  }

  // Create unified error
  const unifiedError = createUnifiedError(error, {
    operation: c.req.method + ' ' + c.req.path
  })

  // Get appropriate status code
  const statusCode = getHttpStatusFromError(unifiedError)

  // Throw as HTTPException for Hono to handle
  throw new HTTPException(statusCode as 400 | 401 | 403 | 404 | 409 | 422 | 402 | 500 | 503, {
    message: unifiedError.message,
    cause: unifiedError
  })
}

/**
 * Creates common error types with unified format
 */
export const UnifiedErrors = {
  notFound(resource: string, id?: string): UnifiedError {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`
    
    const error = new Error(message) as UnifiedError
    error.code = 'NOT_FOUND'
    error.type = 'NOT_FOUND_ERROR'
    error.statusCode = 404
    error.context = { resource, ...(id && { resourceId: id }) }
    return error
  },

  unauthorized(message = 'Authentication required'): UnifiedError {
    const error = new Error(message) as UnifiedError
    error.code = 'UNAUTHORIZED'
    error.type = 'AUTH_ERROR'
    error.statusCode = 401
    return error
  },

  forbidden(operation: string, resource?: string): UnifiedError {
    const message = resource 
      ? `Not authorized to ${operation} ${resource}`
      : `Not authorized to ${operation}`
    
    const error = new Error(message) as UnifiedError
    error.code = 'FORBIDDEN'
    error.type = 'PERMISSION_ERROR'
    error.statusCode = 403
    error.context = { operation, resource }
    return error
  },

  validation(message: string, fields?: Record<string, string>): UnifiedError {
    const error = new Error(message) as UnifiedError
    error.code = 'BAD_REQUEST'
    error.type = 'VALIDATION_ERROR'
    error.statusCode = 400
    error.fields = fields
    return error
  },

  conflict(message: string, resource?: string): UnifiedError {
    const error = new Error(message) as UnifiedError
    error.code = 'CONFLICT'
    error.type = 'CONFLICT_ERROR'
    error.statusCode = 409
    error.context = { resource }
    return error
  },

  serverError(message = 'An internal error occurred'): UnifiedError {
    const error = new Error(message) as UnifiedError
    error.code = 'INTERNAL_SERVER_ERROR'
    error.type = 'SERVER_ERROR'
    error.statusCode = 500
    return error
  }
}

/**
 * Async error handler wrapper for consistent error handling
 */
export function handleAsync<T>(
  handler: () => Promise<T>,
  context?: UnifiedErrorContext
): Promise<T> {
  return handler().catch(error => {
    throw createUnifiedError(error, context)
  })
}