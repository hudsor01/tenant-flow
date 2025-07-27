import type { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verify, JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken'
import type { AuthUser } from '@tenantflow/shared'

// Define context variables
export interface Variables {
  user: AuthUser | null
  jwtPayload?: {
    sub: string
    email: string
    role?: string
    name?: string
    avatarUrl?: string
    iat?: number
    exp?: number
  }
}

// JWT validation options for security
const JWT_OPTIONS = {
  algorithms: ['HS256' as const],
  maxAge: '24h',
  clockTolerance: 30, // 30 seconds tolerance for clock drift
}

// Auth middleware factory with enhanced error handling
export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.set('user', null)
    await next()
    return
  }

  const token = authHeader.substring(7)
  
  // Validate JWT secret exists
  if (!process.env.JWT_SECRET) {
    throw new HTTPException(500, { message: 'Server configuration error' })
  }
  
  try {
    const decoded = verify(token, process.env.JWT_SECRET, JWT_OPTIONS) as {
      sub: string
      email: string
      role?: string
      name?: string
      avatarUrl?: string
      iat?: number
      exp?: number
    }
    
    // Validate required JWT claims
    if (!decoded.sub || !decoded.email) {
      c.set('user', null)
      await next()
      return
    }

    // Set user in context with validated data
    const user: AuthUser = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role || 'OWNER',
      name: decoded.name || decoded.email,
      avatarUrl: decoded.avatarUrl || null
    }
    
    c.set('user', user)
    c.set('jwtPayload', decoded)
  } catch (error) {
    // Enhanced error handling for different JWT error types
    if (error instanceof TokenExpiredError) {
      throw new HTTPException(401, { 
        message: 'Token expired. Please log in again.',
        cause: 'TOKEN_EXPIRED'
      })
    } else if (error instanceof JsonWebTokenError) {
      throw new HTTPException(401, { 
        message: 'Invalid token. Please log in again.',
        cause: 'INVALID_TOKEN'
      })
    } else if (error instanceof NotBeforeError) {
      throw new HTTPException(401, { 
        message: 'Token not yet valid.',
        cause: 'TOKEN_NOT_ACTIVE'
      })
    }
    
    // For other errors, don't expose details to client
    c.set('user', null)
  }

  await next()
})

// Protected route middleware with detailed error messages
export const requireAuth = createMiddleware<{ Variables: Variables }>(async (c: Context, next: Next) => {
  const user = c.get('user')
  
  if (!user) {
    throw new HTTPException(401, {
      message: 'Authentication required. Please log in to access this resource.',
      cause: 'AUTHENTICATION_REQUIRED'
    })
  }
  
  await next()
})

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => 
  createMiddleware<{ Variables: Variables }>(async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      throw new HTTPException(401, {
        message: 'Authentication required.',
        cause: 'AUTHENTICATION_REQUIRED'
      })
    }
    
    if (!allowedRoles.includes(user.role)) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions to access this resource.',
        cause: 'INSUFFICIENT_PERMISSIONS'
      })
    }
    
    await next()
  })

// Admin-only middleware
export const requireAdmin = requireRole(['ADMIN'])

// Owner or Admin middleware
export const requireOwnerOrAdmin = requireRole(['ADMIN', 'OWNER'])