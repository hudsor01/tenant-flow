import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { TypeSafeConfigService } from '../config/config.service'

export interface SecurityHeadersConfig {
  // Content Security Policy
  csp: {
    enabled: boolean
    directives: Record<string, string[]>
    reportUri?: string
    upgradeInsecureRequests: boolean
  }
  // HTTP Strict Transport Security
  hsts: {
    enabled: boolean
    maxAge: number
    includeSubDomains: boolean
    preload: boolean
  }
  // X-Frame-Options
  frameOptions: {
    enabled: boolean
    policy: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM'
    allowFrom?: string
  }
  // X-Content-Type-Options
  contentTypeOptions: {
    enabled: boolean
    nosniff: boolean
  }
  // Referrer Policy
  referrerPolicy: {
    enabled: boolean
    policy: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url'
  }
  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    enabled: boolean
    directives: Record<string, string[]>
  }
  // X-XSS-Protection
  xssProtection: {
    enabled: boolean
    mode: '0' | '1' | '1; mode=block'
  }
  // Additional security headers
  additionalHeaders: Record<string, string>
}

/**
 * Security Headers Middleware
 * 
 * Implements comprehensive security headers following OWASP guidelines.
 * Provides protection against XSS, clickjacking, MIME sniffing, and other attacks.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name)
  private readonly config: SecurityHeadersConfig

  constructor(_configService: TypeSafeConfigService) {
    this.config = this.buildSecurityConfig()
    this.logger.log('Security headers middleware initialized', {
      cspEnabled: this.config.csp.enabled,
      hstsEnabled: this.config.hsts.enabled,
      environment: process.env.NODE_ENV
    })
  }

  use(req: FastifyRequest, res: FastifyReply, next: () => void): void {
    try {
      // Apply security headers
      this.applySecurityHeaders(res, req)
      
      // Log security header application for audit
      this.logger.debug('Security headers applied', {
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      })

      next()
    } catch (error) {
      this.logger.error('Error applying security headers', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: req.url,
        ip: req.ip
      })
      // Don't fail the request if headers can't be applied
      next()
    }
  }

  private applySecurityHeaders(res: FastifyReply, req: FastifyRequest): void {
    // Content Security Policy
    if (this.config.csp.enabled) {
      const cspValue = this.buildCSPValue()
      res.header('Content-Security-Policy', cspValue)
      
      // Add report-only header for testing in development
      if (process.env.NODE_ENV === 'development' && this.config.csp.reportUri) {
        res.header('Content-Security-Policy-Report-Only', cspValue)
      }
    }

    // HTTP Strict Transport Security
    if (this.config.hsts.enabled && req.protocol === 'https') {
      const hstsValue = this.buildHSTSValue()
      res.header('Strict-Transport-Security', hstsValue)
    }

    // X-Frame-Options
    if (this.config.frameOptions.enabled) {
      const frameValue = this.buildFrameOptionsValue()
      res.header('X-Frame-Options', frameValue)
    }

    // X-Content-Type-Options
    if (this.config.contentTypeOptions.enabled && this.config.contentTypeOptions.nosniff) {
      res.header('X-Content-Type-Options', 'nosniff')
    }

    // Referrer Policy
    if (this.config.referrerPolicy.enabled) {
      res.header('Referrer-Policy', this.config.referrerPolicy.policy)
    }

    // Permissions Policy
    if (this.config.permissionsPolicy.enabled) {
      const permissionsValue = this.buildPermissionsPolicyValue()
      if (permissionsValue) {
        res.header('Permissions-Policy', permissionsValue)
      }
    }

    // X-XSS-Protection
    if (this.config.xssProtection.enabled) {
      res.header('X-XSS-Protection', this.config.xssProtection.mode)
    }

    // Additional custom headers
    Object.entries(this.config.additionalHeaders).forEach(([name, value]) => {
      res.header(name, value)
    })

    // Security-focused headers
    res.header('X-DNS-Prefetch-Control', 'off')
    res.header('X-Download-Options', 'noopen')
    res.header('X-Permitted-Cross-Domain-Policies', 'none')
    res.header('Cross-Origin-Embedder-Policy', 'require-corp')
    res.header('Cross-Origin-Opener-Policy', 'same-origin')
    res.header('Cross-Origin-Resource-Policy', 'same-origin')
    
    // Remove server identification
    res.removeHeader('X-Powered-By')
    res.removeHeader('Server')
  }

  private buildSecurityConfig(): SecurityHeadersConfig {
    const isDevelopment = process.env.NODE_ENV === 'development'
    const isProduction = process.env.NODE_ENV === 'production'

    return {
      csp: {
        enabled: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': isDevelopment 
            ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Allow dev tools
            : ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"], // Allow inline styles for components
          'img-src': ["'self'", 'data:', 'https:'],
          'font-src': ["'self'", 'https:', 'data:'],
          'connect-src': ["'self'", 'https://api.stripe.com', 'https://*.supabase.co'],
          'media-src': ["'self'"],
          'object-src': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
          'frame-ancestors': ["'none'"],
          'manifest-src': ["'self'"],
          'worker-src': ["'self'"]
        },
        reportUri: isDevelopment ? '/api/v1/security/csp-report' : undefined,
        upgradeInsecureRequests: isProduction
      },
      hsts: {
        enabled: isProduction,
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      },
      frameOptions: {
        enabled: true,
        policy: 'DENY'
      },
      contentTypeOptions: {
        enabled: true,
        nosniff: true
      },
      referrerPolicy: {
        enabled: true,
        policy: 'strict-origin-when-cross-origin'
      },
      permissionsPolicy: {
        enabled: true,
        directives: {
          'accelerometer': [],
          'ambient-light-sensor': [],
          'autoplay': [],
          'battery': [],
          'camera': [],
          'cross-origin-isolated': [],
          'display-capture': [],
          'document-domain': [],
          'encrypted-media': [],
          'execution-while-not-rendered': [],
          'execution-while-out-of-viewport': [],
          'fullscreen': ["'self'"],
          'geolocation': [],
          'gyroscope': [],
          'magnetometer': [],
          'microphone': [],
          'midi': [],
          'navigation-override': [],
          'payment': ["'self'"], // Allow Stripe payments
          'picture-in-picture': [],
          'publickey-credentials-get': ["'self'"], // Allow WebAuthn
          'screen-wake-lock': [],
          'sync-xhr': [],
          'usb': [],
          'web-share': [],
          'xr-spatial-tracking': []
        }
      },
      xssProtection: {
        enabled: true,
        mode: '1; mode=block'
      },
      additionalHeaders: {
        'X-API-Security': 'enabled',
        'X-Security-Version': 'v2.0'
      }
    }
  }

  private buildCSPValue(): string {
    const directives = Object.entries(this.config.csp.directives)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ')

    let csp = directives

    if (this.config.csp.upgradeInsecureRequests) {
      csp += '; upgrade-insecure-requests'
    }

    if (this.config.csp.reportUri) {
      csp += `; report-uri ${this.config.csp.reportUri}`
    }

    return csp
  }

  private buildHSTSValue(): string {
    let hsts = `max-age=${this.config.hsts.maxAge}`

    if (this.config.hsts.includeSubDomains) {
      hsts += '; includeSubDomains'
    }

    if (this.config.hsts.preload) {
      hsts += '; preload'
    }

    return hsts
  }

  private buildFrameOptionsValue(): string {
    const { policy, allowFrom } = this.config.frameOptions

    if (policy === 'ALLOW-FROM' && allowFrom) {
      return `ALLOW-FROM ${allowFrom}`
    }

    return policy
  }

  private buildPermissionsPolicyValue(): string {
    return Object.entries(this.config.permissionsPolicy.directives)
      .filter(([, sources]) => sources.length > 0 || sources.length === 0) // Include all directives
      .map(([directive, sources]) => {
        if (sources.length === 0) {
          return `${directive}=()` // Deny all
        }
        return `${directive}=(${sources.join(' ')})`
      })
      .join(', ')
  }

  /**
   * Update security configuration at runtime
   */
  updateConfig(updates: Partial<SecurityHeadersConfig>): void {
    Object.assign(this.config, updates)
    this.logger.log('Security headers configuration updated', {
      updates: Object.keys(updates)
    })
  }

  /**
   * Get current security configuration
   */
  getConfig(): SecurityHeadersConfig {
    return { ...this.config }
  }

  /**
   * Validate CSP directives for common security issues
   */
  validateCSPSecurity(): {
    secure: boolean
    warnings: string[]
    recommendations: string[]
  } {
    const warnings: string[] = []
    const recommendations: string[] = []

    // Check for unsafe-inline in script-src
    if (this.config.csp.directives['script-src']?.includes("'unsafe-inline'")) {
      warnings.push("'unsafe-inline' in script-src reduces XSS protection")
      recommendations.push('Use nonces or hashes instead of unsafe-inline for scripts')
    }

    // Check for unsafe-eval in script-src
    if (this.config.csp.directives['script-src']?.includes("'unsafe-eval'")) {
      warnings.push("'unsafe-eval' in script-src allows dangerous script execution")
      recommendations.push('Remove unsafe-eval and avoid eval(), new Function(), etc.')
    }

    // Check for wildcard in script-src
    if (this.config.csp.directives['script-src']?.includes('*')) {
      warnings.push('Wildcard (*) in script-src allows scripts from any domain')
      recommendations.push('Specify exact domains instead of using wildcards')
    }

    // Check for missing base-uri
    if (!this.config.csp.directives['base-uri']) {
      recommendations.push('Add base-uri directive to prevent base tag injection')
    }

    // Check for missing object-src
    if (!this.config.csp.directives['object-src']) {
      recommendations.push("Add object-src 'none' to prevent plugin execution")
    }

    return {
      secure: warnings.length === 0,
      warnings,
      recommendations
    }
  }
}