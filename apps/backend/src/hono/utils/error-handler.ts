import type { HTTPException } from 'hono/http-exception'
import type { Context } from 'hono'
import { handleHonoError } from '../../common/errors/unified-error-handler'
import type { 
  AppError, 
  AuthError,
  ValidationError,
  NetworkError,
  ServerError,
  BusinessError,
  FileUploadError,
  PaymentError 
} from '@tenantflow/shared/types/errors'



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
 * Uses the unified error handler for consistent behavior between NestJS and Hono
 * @param error The error that was caught
 * @param c The Hono context object
 * @returns A standardized JSON error response
 */
export function handleRouteError(error: ApiError, c: Context): Response {
  return handleHonoError(error, c)
}

/**
 * Type-safe wrapper for async route handlers that properly handles errors
 * @param handler The async route handler function
 * @returns A wrapped handler with consistent error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Get context from the last argument (Hono convention)
      const c = args[args.length - 1] as Context
      return handleRouteError(error as ApiError, c)
    }
  }
}