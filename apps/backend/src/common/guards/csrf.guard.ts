import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FastifyRequest } from 'fastify'
import { CsrfTokenService } from '../security/csrf-token.service'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { SessionUtilsService } from '../utils/session-utils.service'
import { CsrfUtilsService } from '../utils/csrf-utils.service'
import { NetworkUtilsService } from '../utils/network-utils.service'

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
    private csrfTokenService: CsrfTokenService,
    private securityMonitor: SecurityMonitorService,
    private sessionUtils: SessionUtilsService,
    private csrfUtils: CsrfUtilsService,
    private networkUtils: NetworkUtilsService
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
    if (this.csrfUtils.isGlobalExemptRoute(url, this.GLOBAL_EXEMPT_ROUTES)) {
      this.logger.debug(`CSRF protection bypassed for global exempt route: ${method} ${url}`)
      return true
    }
    
    // Extract and validate CSRF token
    const csrfToken = this.csrfUtils.extractCsrfToken(request)
    
    if (!csrfToken) {
      const clientIP = this.networkUtils.getClientIP(request)
      
      this.logger.warn(`CSRF token missing for ${method} ${url}`, {
        userAgent: request.headers['user-agent'],
        origin: request.headers.origin,
        referer: request.headers.referer,
        ip: clientIP
      })
      
      // Log security event for monitoring
      void this.securityMonitor.logSecurityEvent({
        type: 'CSRF_VIOLATION',
        ip: clientIP,
        userAgent: request.headers['user-agent'],
        endpoint: `${method} ${url}`,
        severity: 'medium',
        details: {
          violationType: 'MISSING_TOKEN',
          origin: request.headers.origin,
          referer: request.headers.referer,
          sessionId: this.sessionUtils.extractSessionId(request)
        }
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
    if (!this.csrfUtils.isValidCsrfTokenFormat(csrfToken)) {
      const clientIP = this.networkUtils.getClientIP(request)
      
      this.logger.warn(`Invalid CSRF token format for ${method} ${url}`, {
        tokenLength: csrfToken.length,
        tokenPrefix: csrfToken.substring(0, 10),
        ip: clientIP
      })
      
      // Log security event for monitoring
      void this.securityMonitor.logSecurityEvent({
        type: 'CSRF_VIOLATION',
        ip: clientIP,
        userAgent: request.headers['user-agent'],
        endpoint: `${method} ${url}`,
        severity: 'medium',
        details: {
          violationType: 'INVALID_FORMAT',
          tokenLength: csrfToken.length,
          tokenPrefix: csrfToken.substring(0, 10),
          sessionId: this.sessionUtils.extractSessionId(request)
        }
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
    const sessionId = this.sessionUtils.extractSessionId(request)
    if (!sessionId) {
      this.logger.warn(`No session ID found for CSRF validation on ${method} ${url}`, {
        ip: this.networkUtils.getClientIP(request)
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
      const clientIP = this.networkUtils.getClientIP(request)
      
      this.logger.warn(`CSRF token validation failed for ${method} ${url}`, {
        tokenPrefix: csrfToken.substring(0, 16),
        sessionId,
        ip: clientIP,
        userAgent: request.headers['user-agent']
      })
      
      // Log security event for monitoring (high severity - could be attack)
      void this.securityMonitor.logSecurityEvent({
        type: 'CSRF_VIOLATION',
        ip: clientIP,
        userAgent: request.headers['user-agent'],
        endpoint: `${method} ${url}`,
        severity: 'high',
        details: {
          violationType: 'VALIDATION_FAILED',
          tokenPrefix: csrfToken.substring(0, 16),
          sessionId,
          origin: request.headers.origin,
          referer: request.headers.referer
        }
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
}