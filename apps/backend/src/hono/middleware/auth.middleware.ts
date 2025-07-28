import type { Context, Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { AuthUser } from '@tenantflow/shared/types/auth'
import type { AuthService } from '../../auth/auth.service'

// Define context variables
export interface Variables {
  user: AuthUser | null
}

// Create auth middleware factory that uses Supabase token validation via AuthService
export const createAuthMiddleware = (authService: AuthService) => 
  createMiddleware<{ Variables: Variables }>(async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      c.set('user', null)
      await next()
      return
    }

    const token = authHeader.substring(7)
    
    try {
      // Use AuthService to validate Supabase token
      const validatedUser = await authService.validateSupabaseToken(token)
      
      // Convert to AuthUser format
      const user: AuthUser = {
        id: validatedUser.id,
        email: validatedUser.email,
        role: validatedUser.role,
        name: validatedUser.name || validatedUser.email,
        avatarUrl: validatedUser.avatarUrl || null,
        emailVerified: validatedUser.emailVerified || false,
        supabaseId: validatedUser.supabaseId || validatedUser.id,
        stripeCustomerId: validatedUser.stripeCustomerId || null,
        phone: validatedUser.phone || null,
        bio: validatedUser.bio || null,
        createdAt: typeof validatedUser.createdAt === 'string' ? new Date(validatedUser.createdAt) : new Date(),
        updatedAt: typeof validatedUser.updatedAt === 'string' ? new Date(validatedUser.updatedAt) : new Date()
      }
      
      c.set('user', user)
    } catch (error) {
      // Handle authentication errors from AuthService
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired token')) {
          throw new HTTPException(401, { 
            message: 'Token expired or invalid. Please log in again.',
            cause: 'TOKEN_INVALID'
          })
        }
        if (error.message.includes('Email not verified')) {
          throw new HTTPException(401, { 
            message: 'Email verification required.',
            cause: 'EMAIL_NOT_VERIFIED'
          })
        }
      }
      
      // For other errors, don't expose details to client
      c.set('user', null)
    }

    await next()
  })

// Default auth middleware - will be replaced by factory in routes
export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (_c: Context, _next: Next) => {
  // This is a placeholder - actual routes should use createAuthMiddleware(authService)
  throw new HTTPException(500, { message: 'Auth middleware not properly configured' })
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