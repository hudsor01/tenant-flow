import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'
import { CsrfTokenService } from '../security/csrf-token.service'

// Metadata key for CSRF exemption
export const IS_CSRF_EXEMPT_KEY = 'isCsrfExempt'

/**
 * Decorator to exempt a route from CSRF protection
 * Use sparingly and only for routes that have alternative protection (like webhook signatures)
 */
export const CsrfExempt = () => Reflect.metadata(IS_CSRF_EXEMPT_KEY, true)

/**
 * CSRF Protection Guard
 * 
 * Validates CSRF tokens for state-changing operations to prevent
 * Cross-Site Request Forgery attacks.
 * 
 * SECURITY FEATURES:
 * - Validates CSRF tokens on POST/PUT/PATCH/DELETE requests
 * - Supports multiple token sources (headers, form data)
 * - Configurable route exemptions
 * - Detailed security logging
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name)
  
  // HTTP methods that require CSRF protection
  private readonly STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
  
  // Global route exemptions (in addition to @CsrfExempt decorator)
  private readonly GLOBAL_EXEMPT_ROUTES = [
    '/stripe/webhook',        // Stripe webhooks use signature verification
    '/webhooks/auth/supabase', // Supabase webhooks
    '/health',               // Health checks
    '/ping'                  // Ping endpoint
  ]

  constructor(
    private reflector: Reflector,
    private csrfTokenService: CsrfTokenService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const method = request.method
    const url = request.url
    
    // Skip CSRF protection for safe HTTP methods
    if (!this.STATE_CHANGING_METHODS.includes(method)) {
      return true
    }
    
    // Check if route is decorated with @CsrfExempt
    const isCsrfExempt = this.reflector.getAllAndOverride<boolean>(IS_CSRF_EXEMPT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    
    if (isCsrfExempt) {
      this.logger.debug(`CSRF protection bypassed by @CsrfExempt for ${method} ${url}`)
      return true
    }
    
    // Check global exempt routes
    if (this.isGlobalExemptRoute(url)) {
      this.logger.debug(`CSRF protection bypassed for global exempt route: ${method} ${url}`)
      return true
    }
    
    // Extract and validate CSRF token
    const csrfToken = this.extractCsrfToken(request)
    
    if (!csrfToken) {
      this.logger.warn(`CSRF token missing for ${method} ${url}`, {
        userAgent: request.headers['user-agent'],
        origin: request.headers.origin,
        referer: request.headers.referer,
        ip: this.getClientIP(request)
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this operation',
          statusCode: 403,
          details: {
            hint: 'Include X-CSRF-Token header with a valid CSRF token',
            documentation: 'GET /api/v1/csrf/token to obtain a token'
          }
        }
      })
    }
    
    // Validate token format
    if (!this.isValidCsrfTokenFormat(csrfToken)) {
      this.logger.warn(`Invalid CSRF token format for ${method} ${url}`, {
        tokenLength: csrfToken.length,
        tokenPrefix: csrfToken.substring(0, 10),
        ip: this.getClientIP(request)
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token format',
          statusCode: 403,
          details: {
            hint: 'CSRF token must be 16-128 characters of alphanumeric, hyphens, or underscores'
          }
        }
      })
    }
    
    // Validate CSRF token against session
    const sessionId = this.extractSessionId(request)
    if (!sessionId) {
      this.logger.warn(`No session ID found for CSRF validation on ${method} ${url}`, {
        ip: this.getClientIP(request)
      })
      
      throw new ForbiddenException({
        error: {
          code: 'SESSION_REQUIRED',
          message: 'Valid session required for CSRF protection',
          statusCode: 403,
          details: {
            hint: 'Ensure you are properly authenticated and have a valid session'
          }
        }
      })
    }

    // Validate token using both stateful and stateless methods
    const isValidStateful = this.csrfTokenService.validateToken(csrfToken, sessionId)
    const isValidStateless = this.csrfTokenService.validateStatelessToken(csrfToken, sessionId)
    
    if (!isValidStateful && !isValidStateless) {
      this.logger.warn(`CSRF token validation failed for ${method} ${url}`, {
        tokenPrefix: csrfToken.substring(0, 16),
        sessionId,
        ip: this.getClientIP(request),
        userAgent: request.headers['user-agent']
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token validation failed',
          statusCode: 403,
          details: {
            hint: 'Token may be expired, invalid, or from a different session',
            action: 'Obtain a new CSRF token from GET /api/v1/csrf/token'
          }
        }
      })
    }

    this.logger.debug(`CSRF token validated successfully for ${method} ${url}`, {
      sessionId,
      validationType: isValidStateful ? 'stateful' : 'stateless'
    })
    
    return true
  }
  
  /**
   * Check if route is globally exempt from CSRF protection
   */
  private isGlobalExemptRoute(url: string): boolean {
    // Remove query parameters for route matching
    const path = url.split('?')[0]
    
    return this.GLOBAL_EXEMPT_ROUTES.some(exemptRoute => {
      // Handle both full paths and relative paths
      return path === exemptRoute || 
             path?.endsWith(exemptRoute) ||
             path?.includes(exemptRoute)
    })
  }
  
  /**
   * Extract CSRF token from request
   */
  private extractCsrfToken(request: FastifyRequest): string | null {
    // Priority order: X-CSRF-Token > X-XSRF-TOKEN > form field
    
    // Check X-CSRF-Token header (recommended approach)
    const csrfHeader = request.headers['x-csrf-token'] as string
    if (csrfHeader) {
      return csrfHeader
    }
    
    // Check X-XSRF-TOKEN header (Angular/axios convention)
    const xsrfHeader = request.headers['x-xsrf-token'] as string
    if (xsrfHeader) {
      return xsrfHeader
    }
    
    // Check form data for _csrf field (traditional forms)
    const body = request.body as Record<string, unknown>
    if (body && typeof body === 'object' && '_csrf' in body) {
      const formToken = body._csrf
      if (typeof formToken === 'string') {
        return formToken
      }
    }
    
    return null
  }
  
  /**
   * Validate CSRF token format (basic security validation)
   */
  private isValidCsrfTokenFormat(token: string): boolean {
    if (typeof token !== 'string') {
      return false
    }
    
    // Length validation (prevent extremely short or long tokens)
    if (token.length < 16 || token.length > 128) {
      return false
    }
    
    // Character validation (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return false
    }
    
    // Reject obviously fake tokens
    const fakeTokenPatterns = [
      /^test[-_]?token$/i,
      /^fake[-_]?token$/i,
      /^dummy[-_]?token$/i,
      /^csrf[-_]?not[-_]?configured$/i,
      /^1234567890abcdef$/i,
      /^(a|1)+$/,  // Repeated characters
      /^(abc|123)+$/i  // Simple patterns
    ]
    
    if (fakeTokenPatterns.some(pattern => pattern.test(token))) {
      return false
    }
    
    return true
  }
  
  /**
   * Extract session ID from request (JWT token, session cookie, etc.)
   */
  private extractSessionId(request: FastifyRequest): string | null {
    // Try to extract from Authorization header (JWT)
    const authHeader = request.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        // Extract user ID from JWT payload (without verification - just for session ID)
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
        return payload.sub || payload.user_id || payload.id
      } catch {
        // Ignore JWT parsing errors
      }
    }
    
    // Try to extract from session cookie
    const sessionCookie = request.headers.cookie
    if (sessionCookie) {
      const sessionMatch = sessionCookie.match(/session=([^;]+)/)
      if (sessionMatch) {
        return sessionMatch[1]
      }
    }
    
    // Fallback to IP + User-Agent hash for stateless sessions
    const ip = this.getClientIP(request)
    const userAgent = request.headers['user-agent'] || 'unknown'
    const fallbackSessionId = Buffer.from(`${ip}:${userAgent}`).toString('base64').substring(0, 16)
    
    return fallbackSessionId
  }

  /**
   * Get client IP address for logging
   */
  private getClientIP(request: FastifyRequest): string {
    const forwardedFor = request.headers['x-forwarded-for'] as string
    const realIP = request.headers['x-real-ip'] as string
    const cfConnectingIP = request.headers['cf-connecting-ip'] as string
    
    if (forwardedFor) {
      return forwardedFor.split(',')[0]?.trim() || 'unknown'
    }
    
    if (cfConnectingIP) {
      return cfConnectingIP
    }
    
    if (realIP) {
      return realIP
    }
    
    return request.ip || 'unknown'
  }
}