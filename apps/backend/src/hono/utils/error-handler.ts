import { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import type { 
  AppError, 
  AuthError,
  ValidationError,
  NetworkError,
  ServerError,
  BusinessError,
  FileUploadError,
  PaymentError
} from '@tenantflow/shared'

// Union type for all possible error types that can be thrown
export type ApiError = 
  | Error 
  | HTTPException 
  | AppError 
  | AuthError 
  | ValidationError 
  | NetworkError 
  | ServerError 
  | BusinessError 
  | FileUploadError 
  | PaymentError

// Standard error response interface (exported for use in middleware)
export interface ErrorResponse {
  success: false
  error: {
    message: string
    code: string
    timestamp: string
    requestId?: string
  }
}

/**
 * Handles errors consistently across all route handlers
 * @param error The error that was caught
 * @param c The Hono context object
 * @returns A standardized JSON error response
 */
export function handleRouteError(error: ApiError, _c: Context): Response {
  // HTTPException (from Hono) - these are intentional HTTP errors
  if (error instanceof HTTPException) {
    throw error
  }

  // Known business errors with specific messages
  if (error instanceof Error) {
    const message = error.message
    
    // Check for common business logic errors
    if (message.includes('not found')) {
      throw new HTTPException(404, { message })
    }
    
    if (message.includes('already exists') || message.includes('duplicate')) {
      throw new HTTPException(409, { message })
    }
    
    if (message.includes('unauthorized') || message.includes('permission')) {
      throw new HTTPException(403, { message })
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      throw new HTTPException(400, { message })
    }
  }

  // Default to internal server error for unknown errors
  throw new HTTPException(500, { 
    message: error instanceof Error ? error.message : 'Unknown error' 
  })
}

/**
 * Type-safe wrapper for async route handlers that properly handles errors
 * @param handler The async route handler function
 * @returns A wrapped handler with consistent error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Get context from the last argument (Hono convention)
      const c = args[args.length - 1] as Context
      return handleRouteError(error as ApiError, c)
    }
  }
}