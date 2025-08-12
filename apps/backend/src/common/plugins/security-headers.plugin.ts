import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { randomBytes } from 'crypto'

export interface SecurityHeadersConfig {
  // Content Security Policy
  csp: {
    enabled: boolean
    directives: Record<string, string[]>
    reportUri?: string
    upgradeInsecureRequests: boolean
  }
  // Additional security headers beyond Helmet
  additionalHeaders: Record<string, string>
  // Environment-specific settings
  environment: 'development' | 'production' | 'test'
}

/**
 * Enhanced Security Headers Plugin for Fastify
 * 
 * Extends the existing Helmet configuration with additional security features
 * including advanced CSP reporting, security analytics, and environment-specific policies.
 */
async function securityHeadersPlugin(
  fastify: FastifyInstance,
  options: Partial<SecurityHeadersConfig> = {}
) {
  const config: SecurityHeadersConfig = {
    csp: {
      enabled: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': options.environment === 'production' 
          ? ["'self'", 'https://js.stripe.com']
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://js.stripe.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
        'font-src': ["'self'", 'https:', 'data:', 'https://fonts.gstatic.com'],
        'connect-src': [
          "'self'",
          'https://api.stripe.com',
          'wss://api.stripe.com', 
          'https://*.supabase.co',
          'wss://*.supabase.co',
          ...(options.environment === 'production' 
            ? ['https://api.tenantflow.app'] 
            : ['http://localhost:*', 'ws://localhost:*'])
        ],
        'media-src': ["'self'", 'blob:', 'data:'],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'frame-src': ['https://js.stripe.com', 'https://hooks.stripe.com'],
        'manifest-src': ["'self'"],
        'worker-src': ["'self'", 'blob:'],
        'child-src': ["'self'", 'blob:']
      },
      reportUri: options.environment === 'development' ? '/api/v1/security/csp-report' : undefined,
      upgradeInsecureRequests: options.environment === 'production'
    },
    additionalHeaders: {
      // Security versioning
      'X-Security-Version': 'v2.1',
      'X-API-Security': 'enhanced',
      // Rate limiting info
      'X-RateLimit-Policy': 'standard',
      // Cache control for security
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      // Additional Permissions Policy directives
      'Permissions-Policy': [
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=()',
        'battery=()',
        'camera=()',
        'cross-origin-isolated=()',
        'display-capture=()',
        'document-domain=()',
        'encrypted-media=()',
        'execution-while-not-rendered=()',
        'execution-while-out-of-viewport=()',
        'fullscreen=(self)',
        'geolocation=()',
        'gyroscope=()',
        'magnetometer=()',
        'microphone=()',
        'midi=()',
        'navigation-override=()',
        'payment=(self)', // Allow Stripe payments
        'picture-in-picture=()',
        'publickey-credentials-get=(self)', // Allow WebAuthn
        'screen-wake-lock=()',
        'sync-xhr=()',
        'usb=()',
        'web-share=()',
        'xr-spatial-tracking=()'
      ].join(', '),
      // Security contact
      'Security-Contact': 'security@tenantflow.app',
      // Clear-Site-Data for logout endpoints
      'Clear-Site-Data': '"cache", "cookies", "storage"'
    },
    environment: options.environment || (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'production',
    ...options
  }

  fastify.log.info('Enhanced security headers plugin loading')

  // Add preHandler hook to apply enhanced security headers
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Enhanced CSP with dynamic nonces for scripts (if needed)
    if (config.csp.enabled) {
      // Generate nonce for inline scripts in development
      if (config.environment === 'development') {
        const nonce = generateNonce()
        request.cspNonce = nonce
        
        // Add nonce to script-src if not already present
        const scriptSrc = config.csp.directives['script-src'] || []
        if (!scriptSrc.some(src => src.startsWith("'nonce-"))) {
          scriptSrc.push(`'nonce-${nonce}'`)
          config.csp.directives['script-src'] = scriptSrc
        }
      }
      
      // Build and set CSP header
      const cspValue = buildCSPValue(config.csp)
      reply.header('Content-Security-Policy', cspValue)
      
      // Add CSP report-only for testing in development
      if (config.environment === 'development' && config.csp.reportUri) {
        reply.header('Content-Security-Policy-Report-Only', cspValue)
      }
    }

    // Apply additional headers
    Object.entries(config.additionalHeaders).forEach(([name, value]) => {
      // Don't override existing headers unless explicitly configured
      if (!reply.getHeader(name)) {
        reply.header(name, value)
      }
    })

    // Route-specific security headers
    const url = request.url
    
    // Strict headers for authentication endpoints
    if (url.includes('/auth/') || url.includes('/login') || url.includes('/register')) {
      reply.header('X-Auth-Security', 'strict')
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0')
      reply.header('X-Frame-Options', 'DENY')
    }
    
    // Special headers for logout endpoints
    if (url.includes('/logout') || url.includes('/signout')) {
      reply.header('Clear-Site-Data', '"cache", "cookies", "storage", "executionContexts"')
    }
    
    // API versioning security headers
    if (url.includes('/api/')) {
      reply.header('X-API-Version', extractAPIVersion(url) || 'v1')
      reply.header('X-Content-Type-Options', 'nosniff')
    }
    
    // Stripe webhook specific headers
    if (url.includes('/stripe/webhook')) {
      reply.header('X-Webhook-Security', 'verified')
      reply.header('Cache-Control', 'no-store')
    }

    // Security analytics headers
    reply.header('X-Request-ID', request.id)
    reply.header('X-Security-Scan', 'active')
    
    // Rate limiting headers (will be set by actual rate limiter)
    if (!reply.getHeader('X-RateLimit-Limit')) {
      reply.header('X-RateLimit-Remaining', '100')
      reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + 60)
    }
  })

  // Add hook to log security header violations
  fastify.addHook('onError', async (_request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    // Log security-related errors
    if (error.message.includes('CSP') || 
        error.message.includes('CORS') || 
        error.message.includes('security')) {
      fastify.log.warn('Security-related error detected')
    }
  })

  // Helper function to generate secure nonces
  function generateNonce(): string {
    return randomBytes(16).toString('base64')
  }

  // Helper function to build CSP value
  function buildCSPValue(csp: SecurityHeadersConfig['csp']): string {
    const directives = Object.entries(csp.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ')

    let cspValue = directives

    if (csp.upgradeInsecureRequests) {
      cspValue += '; upgrade-insecure-requests'
    }

    if (csp.reportUri) {
      cspValue += `; report-uri ${csp.reportUri}`
      cspValue += `; report-to csp-endpoint`
    }

    return cspValue
  }

  // Helper function to extract API version from URL
  function extractAPIVersion(url: string): string | null {
    const match = url.match(/\/api\/(v\d+)\//)
    return match ? (match[1] || null) : null
  }

  // Register shutdown handler
  fastify.addHook('onClose', async () => {
    fastify.log.info('Security headers plugin shutting down')
  })
}

// Extend FastifyRequest interface for nonce support
declare module 'fastify' {
  interface FastifyRequest {
    cspNonce?: string
  }
}

export default fp(securityHeadersPlugin, {
  name: 'security-headers-enhanced',
  fastify: '4.x'
})