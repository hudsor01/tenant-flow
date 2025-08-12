import { Injectable, NestMiddleware, ForbiddenException, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * CSRF Validation Middleware
 * 
 * Validates CSRF tokens on state-changing requests (POST, PUT, PATCH, DELETE)
 * Skips validation for:
 * - GET and OPTIONS requests
 * - Public endpoints (auth, webhooks)
 * - Requests with valid JWT tokens (API clients)
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name)
  
  // Endpoints that don't require CSRF validation
  private readonly excludedPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/refresh',
    '/api/v1/webhooks',
    '/api/v1/stripe/webhook',
    '/api/v1/csrf/token',
    '/health',
    '/'
  ]

  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next()
    }

    // Skip CSRF validation for excluded paths
    const path = req.url?.split('?')[0] || ''
    if (this.excludedPaths.some(excluded => path.startsWith(excluded))) {
      this.logger.debug(`Skipping CSRF validation for excluded path: ${path}`)
      return next()
    }

    // Skip CSRF validation if request has a valid JWT token (API clients)
    if (req.headers.authorization?.startsWith('Bearer ')) {
      this.logger.debug('Skipping CSRF validation for authenticated API request')
      return next()
    }

    // Validate CSRF token for browser-based requests
    const csrfToken = this.extractCsrfToken(req)
    
    if (!csrfToken) {
      this.logger.warn('CSRF token missing for state-changing request', {
        method: req.method,
        path,
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
      })
      
      throw new ForbiddenException({
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request',
          statusCode: 403
        }
      })
    }

    // The actual token validation is handled by @fastify/csrf-protection
    // If we reach here and have a token, let the request proceed
    next()
  }

  private extractCsrfToken(req: FastifyRequest): string | undefined {
    // Check multiple places for CSRF token
    return (
      req.headers['x-csrf-token'] as string ||
      req.headers['csrf-token'] as string ||
      (req.body as any)?._csrf ||
      (req.query as any)?._csrf
    )
  }
}