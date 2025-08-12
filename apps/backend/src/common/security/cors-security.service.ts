import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SecurityMonitorService } from './security-monitor.service'

export interface CorsOriginConfig {
  pattern: string | RegExp
  description: string
  allowCredentials: boolean
  maxAge?: number
  methods?: string[]
  headers?: string[]
  exposedHeaders?: string[]
}

export interface CorsSecurityConfig {
  enabled: boolean
  origins: CorsOriginConfig[]
  defaultOrigin: {
    allowCredentials: boolean
    maxAge: number
    methods: string[]
    headers: string[]
    exposedHeaders: string[]
  }
  blockedOrigins: string[]
  rateLimiting: {
    enabled: boolean
    windowMs: number
    maxRequests: number
  }
}

@Injectable()
export class CorsSecurityService {
  private readonly logger = new Logger(CorsSecurityService.name)
  private readonly corsConfig: CorsSecurityConfig
  private readonly originAttempts = new Map<string, number[]>()

  constructor(
    private readonly configService: ConfigService,
    private readonly securityMonitor: SecurityMonitorService
  ) {
    this.corsConfig = this.initializeCorsConfig()
    this.startCleanupInterval()
  }

  private initializeCorsConfig(): CorsSecurityConfig {
    const env = this.configService.get<string>('NODE_ENV', 'development')
    
    return {
      enabled: true,
      origins: this.getEnvironmentOrigins(env),
      defaultOrigin: {
        allowCredentials: false,
        maxAge: 86400, // 24 hours
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: [
          'Accept',
          'Accept-Language',
          'Content-Language',
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-CSRF-Token'
        ],
        exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
      },
      blockedOrigins: [
        'null', // File protocol
        'data:', // Data URLs
        'javascript:', // JavaScript URLs
        'vbscript:', // VBScript URLs
        'chrome-extension:', // Browser extensions
        'moz-extension:', // Firefox extensions
        'safari-extension:' // Safari extensions
      ],
      rateLimiting: {
        enabled: true,
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100 // Max 100 CORS preflight requests per minute per origin
      }
    }
  }

  private getEnvironmentOrigins(env: string): CorsOriginConfig[] {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')
    
    const baseOrigins: CorsOriginConfig[] = [
      {
        pattern: frontendUrl,
        description: 'Main frontend application',
        allowCredentials: true,
        maxAge: 86400,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        headers: [
          'Accept',
          'Accept-Language',
          'Content-Language',
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-CSRF-Token',
          'X-User-ID',
          'X-Organization-ID'
        ],
        exposedHeaders: [
          'X-Total-Count',
          'X-Rate-Limit-Remaining',
          'X-Rate-Limit-Reset',
          'X-Request-ID'
        ]
      }
    ]

    if (env === 'development') {
      baseOrigins.push(
        {
          pattern: /^https?:\/\/localhost:\d+$/,
          description: 'Local development servers',
          allowCredentials: true,
          maxAge: 0, // No caching in development
        },
        {
          pattern: /^https?:\/\/127\.0\.0\.1:\d+$/,
          description: 'Local development servers (127.0.0.1)',
          allowCredentials: true,
          maxAge: 0,
        },
        {
          pattern: /^https?:\/\/.*\.ngrok\.io$/,
          description: 'ngrok tunnels for development',
          allowCredentials: true,
          maxAge: 0,
        }
      )
    } else if (env === 'staging') {
      const stagingDomains = this.configService.get<string>('STAGING_DOMAINS', '').split(',')
      stagingDomains.forEach(domain => {
        if (domain.trim()) {
          baseOrigins.push({
            pattern: `https://${domain.trim()}`,
            description: `Staging environment: ${domain}`,
            allowCredentials: true,
            maxAge: 3600, // 1 hour caching for staging
          })
        }
      })
    } else if (env === 'production') {
      const productionDomains = this.configService.get<string>('PRODUCTION_DOMAINS', '').split(',')
      productionDomains.forEach(domain => {
        if (domain.trim()) {
          baseOrigins.push({
            pattern: `https://${domain.trim()}`,
            description: `Production environment: ${domain}`,
            allowCredentials: true,
            maxAge: 86400, // 24 hours caching for production
          })
        }
      })
    }

    return baseOrigins
  }

  /**
   * Validate origin against CORS policy
   */
  validateOrigin(origin: string, userAgent?: string, ip?: string): boolean {
    if (!this.corsConfig.enabled) {
      return true
    }

    // Check if origin is explicitly blocked
    if (this.isOriginBlocked(origin)) {
      void this.securityMonitor.logSecurityEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        ip,
        details: {
          operation: 'cors_blocked_origin',
          origin,
          userAgent,
          reason: 'Origin in blocklist'
        }
      })
      return false
    }

    // Check rate limiting
    if (!this.checkRateLimit(origin, ip)) {
      void this.securityMonitor.logSecurityEvent({
        type: 'RATE_LIMIT_EXCEEDED',
        ip,
        details: {
          operation: 'cors_rate_limit',
          origin,
          userAgent
        }
      })
      return false
    }

    // Check against allowed origins
    const isAllowed = this.isOriginAllowed(origin)
    
    if (!isAllowed) {
      void this.securityMonitor.logSecurityEvent({
        type: 'PERMISSION_DENIED',
        ip,
        details: {
          operation: 'cors_origin_denied',
          origin,
          userAgent,
          reason: 'Origin not in allowlist'
        }
      })
    } else {
      this.logger.debug(`CORS origin validated: ${origin}`)
    }

    return isAllowed
  }

  /**
   * Get CORS configuration for a specific origin
   */
  getCorsConfigForOrigin(origin: string): Partial<CorsOriginConfig> | null {
    if (!this.validateOrigin(origin)) {
      return null
    }

    const matchedConfig = this.corsConfig.origins.find(config => {
      if (typeof config.pattern === 'string') {
        return config.pattern === origin
      }
      return config.pattern.test(origin)
    })

    return matchedConfig || this.corsConfig.defaultOrigin
  }

  /**
   * Get complete CORS headers for response
   */
  getCorsHeaders(origin: string, _method?: string): Record<string, string> {
    const config = this.getCorsConfigForOrigin(origin)
    if (!config) {
      return {}
    }

    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin'
    }

    if (config.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    if (config.maxAge !== undefined) {
      headers['Access-Control-Max-Age'] = config.maxAge.toString()
    }

    if (config.methods && config.methods.length > 0) {
      headers['Access-Control-Allow-Methods'] = config.methods.join(', ')
    }

    if (config.headers && config.headers.length > 0) {
      headers['Access-Control-Allow-Headers'] = config.headers.join(', ')
    }

    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ')
    }

    // Add security headers for CORS
    headers['X-Content-Type-Options'] = 'nosniff'
    headers['X-Frame-Options'] = 'DENY'

    return headers
  }

  private isOriginBlocked(origin: string): boolean {
    return this.corsConfig.blockedOrigins.some(blockedOrigin => {
      if (typeof blockedOrigin === 'string') {
        return origin.toLowerCase().includes(blockedOrigin.toLowerCase())
      }
      return false
    })
  }

  private isOriginAllowed(origin: string): boolean {
    return this.corsConfig.origins.some(config => {
      if (typeof config.pattern === 'string') {
        return config.pattern === origin
      }
      return config.pattern.test(origin)
    })
  }

  private checkRateLimit(origin: string, ip?: string): boolean {
    if (!this.corsConfig.rateLimiting.enabled) {
      return true
    }

    const key = `${origin}-${ip || 'unknown'}`
    const now = Date.now()
    const windowStart = now - this.corsConfig.rateLimiting.windowMs
    
    if (!this.originAttempts.has(key)) {
      this.originAttempts.set(key, [])
    }

    const attempts = this.originAttempts.get(key) || []
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(timestamp => timestamp > windowStart)
    
    // Check if we're over the limit
    if (recentAttempts.length >= this.corsConfig.rateLimiting.maxRequests) {
      return false
    }

    // Add current attempt
    recentAttempts.push(now)
    this.originAttempts.set(key, recentAttempts)
    
    return true
  }

  private startCleanupInterval(): void {
    // Clean up old rate limit entries every 5 minutes
    setInterval(() => {
      this.cleanupRateLimitEntries()
    }, 5 * 60 * 1000)
  }

  private cleanupRateLimitEntries(): void {
    const now = Date.now()
    const cutoff = now - (this.corsConfig.rateLimiting.windowMs * 2) // Keep double the window
    
    for (const [key, attempts] of this.originAttempts.entries()) {
      const recentAttempts = attempts.filter(timestamp => timestamp > cutoff)
      
      if (recentAttempts.length === 0) {
        this.originAttempts.delete(key)
      } else {
        this.originAttempts.set(key, recentAttempts)
      }
    }
    
    this.logger.debug(`CORS rate limit cleanup completed. Active origins: ${this.originAttempts.size}`)
  }

  /**
   * Add origin to allowlist dynamically (for administrative purposes)
   */
  addAllowedOrigin(config: CorsOriginConfig): void {
    this.corsConfig.origins.push(config)
    this.logger.log(`Added CORS origin: ${config.pattern} - ${config.description}`)
    
    void this.securityMonitor.logSecurityEvent({
      type: 'AUTH_SUCCESS',
      details: {
        operation: 'cors_origin_added',
        pattern: config.pattern.toString(),
        description: config.description
      }
    })
  }

  /**
   * Remove origin from allowlist
   */
  removeAllowedOrigin(pattern: string | RegExp): boolean {
    const initialLength = this.corsConfig.origins.length
    this.corsConfig.origins = this.corsConfig.origins.filter(config => 
      config.pattern !== pattern
    )
    
    const removed = this.corsConfig.origins.length < initialLength
    if (removed) {
      this.logger.log(`Removed CORS origin: ${pattern}`)
      
      void this.securityMonitor.logSecurityEvent({
        type: 'AUTH_SUCCESS',
        details: {
          operation: 'cors_origin_removed',
          pattern: pattern.toString()
        }
      })
    }
    
    return removed
  }

  /**
   * Get current CORS statistics
   */
  getCorsStatistics(): {
    enabledOrigins: number
    blockedOrigins: number
    rateLimitedOrigins: number
    totalRequests: number
  } {
    return {
      enabledOrigins: this.corsConfig.origins.length,
      blockedOrigins: this.corsConfig.blockedOrigins.length,
      rateLimitedOrigins: this.originAttempts.size,
      totalRequests: Array.from(this.originAttempts.values())
        .reduce((total, attempts) => total + attempts.length, 0)
    }
  }
}