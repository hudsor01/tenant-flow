import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
// Error response types are defined locally to avoid import overhead

// Enhanced error response interface
interface ErrorResponse {
  success: false
  error: {
    message: string
    code: string
    timestamp: string
    requestId?: string
    details?: Record<string, string | number | boolean | null>
  }
}

// Global error handler middleware
export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.req.header('x-request-id') || crypto.randomUUID()
  
  // Base error response structure
  const baseResponse: ErrorResponse = {
    success: false,
    error: {
      message: 'An error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      requestId
    }
  }

  // Handle HTTPException (Hono's built-in HTTP errors)
  if (err instanceof HTTPException) {
    const status = err.status
    const cause = err.cause as string
    
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: err.message,
        code: cause || getErrorCodeFromStatus(status)
      }
    }, status)
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          issues: err.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code
          }))
        }
      }
    }, 400)
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      }
    }, 401)
  }

  if (err.name === 'TokenExpiredError') {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED'
      }
    }, 401)
  }

  // Handle database errors (Prisma)
  if ('code' in err && err.code === 'P2002') {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'A record with this information already exists',
        code: 'DUPLICATE_RECORD'
      }
    }, 409)
  }

  if ('code' in err && err.code === 'P2025') {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Record not found',
        code: 'NOT_FOUND'
      }
    }, 404)
  }

  // Handle network/timeout errors
  if (err.name === 'TimeoutError' || ('code' in err && err.code === 'TIMEOUT')) {
    return c.json({
      ...baseResponse,
      error: {
        ...baseResponse.error,
        message: 'Request timeout',
        code: 'REQUEST_TIMEOUT'
      }
    }, 408)
  }

  // Log unexpected errors for debugging
  console.error('Unhandled error:', {
    error: err,
    stack: err.stack,
    requestId,
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('user-agent'),
    timestamp: new Date().toISOString()
  })

  // Generic error response (don't expose internal error details)
  return c.json({
    ...baseResponse,
    error: {
      ...baseResponse.error,
      message: process.env.NODE_ENV === 'development' 
        ? err.message 
        : 'An internal server error occurred',
      code: 'INTERNAL_ERROR'
    }
  }, 500)
}

// Helper function to map HTTP status codes to error codes
function getErrorCodeFromStatus(status: number): string {
  const statusCodeMap: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    408: 'REQUEST_TIMEOUT',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    415: 'UNSUPPORTED_MEDIA_TYPE',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  }
  
  return statusCodeMap[status] || 'UNKNOWN_ERROR'
}

// Not found handler
export const notFoundHandler = (c: { req: { method: string; path: string }; json: (data: ErrorResponse, status?: number) => Response }) => {
  return c.json({
    success: false,
    error: {
      message: `Route ${c.req.method} ${c.req.path} not found`,
      code: 'ROUTE_NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  }, 404)
}