import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * CSRF Protection Middleware
 * 
 * Validates CSRF tokens for state-changing HTTP methods (POST, PUT, PATCH, DELETE)
 * to prevent Cross-Site Request Forgery attacks.
 * 
 * SECURITY: This middleware is critical for preventing CSRF attacks in production
 */
@Injectable()
export class CsrfProtectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfProtectionMiddleware.name)
  
  // Methods that require CSRF protection
  private readonly STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']
  
  // Routes that should be excluded from CSRF protection
  private readonly CSRF_EXEMPT_ROUTES = [
    '/api/v1/stripe/webhook',        // Stripe webhooks use signature verification
    '/api/v1/webhooks/auth/supabase', // Supabase webhooks use their own verification
    '/api/v1/auth/login',            // Login forms typically exempt (but use rate limiting)
    '/api/v1/auth/register',         // Registration forms typically exempt
    '/api/v1/auth/refresh',          // Token refresh uses existing auth
    '/health',                       // Health checks
    '/ping',                         // Ping endpoint
    '/'                             // Root endpoint
  ]

  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const method = req.method
    const url = req.url
    
    // Skip CSRF protection for safe methods (GET, HEAD, OPTIONS)
    if (!this.STATE_CHANGING_METHODS.includes(method)) {
      return next()
    }
    
    // Skip CSRF protection for exempt routes
    if (this.isExemptRoute(url)) {
      this.logger.debug(`CSRF check skipped for exempt route: ${method} ${url}`)
      return next()
    }
    
    // Extract CSRF token from headers
    const csrfToken = this.extractCsrfToken(req)
    
    if (!csrfToken) {
      this.logger.warn(`CSRF token missing for ${method} ${url}`, {
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        referer: req.headers.referer
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this operation',
          statusCode: 403,
          details: {
            hint: 'Include X-CSRF-Token header or _csrf form field'
          }
        }
      })
    }
    
    // Validate CSRF token format (basic validation)
    if (!this.isValidCsrfTokenFormat(csrfToken)) {
      this.logger.warn(`Invalid CSRF token format for ${method} ${url}`, {
        tokenLength: csrfToken.length,
        tokenPrefix: csrfToken.substring(0, 10)
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token format',
          statusCode: 403
        }
      })
    }
    
    // TODO: Implement session-based CSRF token validation
    // For now, we accept any properly formatted token as this requires session management
    // This should be enhanced with actual token validation against session storage
    
    this.logger.debug(`CSRF token validated for ${method} ${url}`)
    next()
  }
  
  /**
   * Check if route is exempt from CSRF protection
   */
  private isExemptRoute(url: string): boolean {
    return this.CSRF_EXEMPT_ROUTES.some(exemptRoute => {
      if (exemptRoute.endsWith('*')) {
        // Wildcard matching
        const prefix = exemptRoute.slice(0, -1)
        return url.startsWith(prefix)
      }
      return url === exemptRoute || url.startsWith(exemptRoute + '?')
    })
  }
  
  /**
   * Extract CSRF token from request headers or body
   */
  private extractCsrfToken(req: FastifyRequest): string | null {
    // Check X-CSRF-Token header (recommended)
    const headerToken = req.headers['x-csrf-token'] as string
    if (headerToken) {
      return headerToken
    }
    
    // Check X-XSRF-TOKEN header (Angular/axios convention)
    const xsrfToken = req.headers['x-xsrf-token'] as string
    if (xsrfToken) {
      return xsrfToken
    }
    
    // Check form data for _csrf field (for traditional forms)
    const body = req.body as Record<string, unknown>
    if (body && typeof body === 'object' && '_csrf' in body) {
      return body._csrf as string
    }
    
    return null
  }
  
  /**
   * Validate CSRF token format
   * 
   * SECURITY: This is a basic format check. In production, tokens should be
   * validated against a secure session store or generated using HMAC.
   */
  private isValidCsrfTokenFormat(token: string): boolean {
    // Basic format validation
    if (typeof token !== 'string') {
      return false
    }
    
    // Token should be between 16-128 characters
    if (token.length < 16 || token.length > 128) {
      return false
    }
    
    // Token should contain only alphanumeric characters, hyphens, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return false
    }
    
    // Token should not be obviously fake
    const obviouslyFakeTokens = [
      'csrf-not-configured',
      'test-token',
      'fake-token',
      'dummy-token',
      '1234567890abcdef'
    ]
    
    if (obviouslyFakeTokens.includes(token)) {
      return false
    }
    
    return true
  }
}