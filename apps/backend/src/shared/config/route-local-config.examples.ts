/**
 * Route-Local Configuration Examples
 * 
 * This file demonstrates how to use native Fastify route configuration
 * to optimize individual endpoints without introducing a meta-config layer.
 * 
 * PRINCIPLES:
 * 1. Use native Fastify route options only
 * 2. Keep configuration close to routes
 * 3. No custom decorators or meta-config layers
 * 4. Focus on performance and security benefits
 */

import type { RouteOptions } from 'fastify'
import type { FastifyRateLimitOptions } from '@fastify/rate-limit'
import type { FastifyCompressOptions } from '@fastify/compress'

// ============================================================================
// ROUTE-SPECIFIC RATE LIMITING CONFIGURATIONS
// ============================================================================

/**
 * Authentication endpoints - aggressive rate limiting
 */
export const AuthRouteConfig = {
  login: {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 minute',
        keyGenerator: (req) => `auth_login_${req.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Login Attempts',
          message: 'Please wait before trying again'
        })
      } as FastifyRateLimitOptions
    }
  },
  
  register: {
    config: {
      rateLimit: {
        max: 2,
        timeWindow: '5 minutes',
        keyGenerator: (req) => `auth_register_${req.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Registration Limit Exceeded', 
          message: 'Account creation is limited'
        })
      } as FastifyRateLimitOptions
    }
  },

  refresh: {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req) => {
          // Use user ID from JWT for authenticated rate limiting
          const authHeader = req.headers.authorization
          const userId = extractUserIdFromToken(authHeader)
          return `auth_refresh_${userId || req.ip}`
        }
      } as FastifyRateLimitOptions
    }
  }
} as const

/**
 * File upload endpoints - specialized configuration
 */
export const FileUploadRouteConfig = {
  documents: {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (req) => `upload_doc_${req.ip}`
      } as FastifyRateLimitOptions,
      bodyLimit: 50 * 1024 * 1024, // 50MB for documents
      preHandler: async function(request: _request, reply: _reply) {
        // Disable compression for uploads (save CPU)
        request.raw.headers['accept-encoding'] = 'identity'
      }
    }
  },

  avatars: {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      } as FastifyRateLimitOptions,
      bodyLimit: 5 * 1024 * 1024 // 5MB for images
    }
  }
} as const

/**
 * API endpoints with different performance requirements
 */
export const ApiRouteConfig = {
  // Heavy computation endpoints
  reports: {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => `reports_${extractUserIdFromToken(req.headers.authorization) || req.ip}`
      } as FastifyRateLimitOptions,
      connectionTimeout: 60000, // 60 seconds for reports
      keepAliveTimeout: 65000
    }
  },

  // Real-time data endpoints  
  dashboard: {
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      } as FastifyRateLimitOptions,
      connectionTimeout: 5000, // Fast timeout for dashboards
      // Enable aggressive caching headers
      onSend: async function(request: _request, reply: _reply, payload) {
        // Add cache headers for dashboard data
        reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        reply.header('Vary', 'Authorization')
        return payload
      }
    }
  },

  // Webhook endpoints
  webhooks: {
    config: {
      rateLimit: {
        max: 1000,
        timeWindow: '1 minute',
        keyGenerator: (req) => `webhook_${req.headers['x-webhook-source'] || req.ip}`
      } as FastifyRateLimitOptions,
      bodyLimit: 10 * 1024 * 1024, // 10MB for webhook payloads
      // Disable CSRF for webhooks
      preHandler: async function(request: _request, reply: _reply) {
        // Skip CSRF validation
        request.raw.skipCsrf = true
      }
    }
  },

  // Public API endpoints
  public: {
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
        keyGenerator: (req) => `public_${req.ip}`,
        skipOnError: false
      } as FastifyRateLimitOptions,
      // Enable compression for public APIs
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('Cache-Control', 'public, max-age=300, s-maxage=600')
        return payload
      }
    }
  }
} as const

// ============================================================================
// COMPRESSION CONFIGURATIONS BY ENDPOINT TYPE  
// ============================================================================

/**
 * Selective compression based on content type and endpoint
 */
export const CompressionConfig = {
  // Disable compression for binary content
  binaryEndpoints: {
    config: {
      preHandler: async function(request: _request, reply: _reply) {
        // Disable compression for binary responses
        reply.header('Content-Encoding', 'identity')
      }
    }
  },

  // Aggressive compression for JSON APIs
  jsonApi: {
    config: {
      onSend: async function(request: _request, reply: _reply, payload) {
        // Force compression for JSON responses > 1KB
        const contentType = reply.getHeader('content-type')
        if (typeof contentType === 'string' && contentType.includes('application/json')) {
          reply.header('Vary', 'Accept-Encoding')
        }
        return payload
      }
    }
  },

  // Streaming responses - no compression
  streaming: {
    config: {
      preHandler: async function(request: _request, reply: _reply) {
        // Disable compression for streams
        request.raw.headers['accept-encoding'] = 'identity'
        reply.header('Cache-Control', 'no-cache')
      }
    }
  }
} as const

// ============================================================================
// TIMEOUT CONFIGURATIONS BY ENDPOINT TYPE
// ============================================================================

export const TimeoutConfig = {
  // Fast endpoints - strict timeouts
  health: {
    config: {
      connectionTimeout: 1000,
      keepAliveTimeout: 2000
    }
  },

  // Search endpoints - medium timeouts
  search: {
    config: {
      connectionTimeout: 15000,
      keepAliveTimeout: 20000,
      rateLimit: {
        max: 30,
        timeWindow: '1 minute'
      } as FastifyRateLimitOptions
    }
  },

  // Bulk operations - generous timeouts
  bulk: {
    config: {
      connectionTimeout: 120000, // 2 minutes
      keepAliveTimeout: 125000,
      rateLimit: {
        max: 2,
        timeWindow: '5 minutes'
      } as FastifyRateLimitOptions
    }
  }
} as const

// ============================================================================
// SECURITY CONFIGURATIONS BY ENDPOINT TYPE
// ============================================================================

export const SecurityConfig = {
  // Admin endpoints - enhanced security
  admin: {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req) => `admin_${extractUserIdFromToken(req.headers.authorization) || req.ip}`,
        skipSuccessfulRequests: false
      } as FastifyRateLimitOptions,
      // Add security headers
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('X-Content-Type-Options', 'nosniff')
        reply.header('X-Frame-Options', 'DENY')
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
        return payload
      }
    }
  },

  // Public endpoints - basic protection
  public: {
    config: {
      rateLimit: {
        max: 200,
        timeWindow: '1 minute',
        keyGenerator: (req) => `public_${req.ip}`
      } as FastifyRateLimitOptions,
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('X-Content-Type-Options', 'nosniff')
        return payload
      }
    }
  }
} as const

// ============================================================================
// CACHING CONFIGURATIONS BY CONTENT TYPE
// ============================================================================

export const CacheConfig = {
  // Static content - long cache
  static: {
    config: {
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('Cache-Control', 'public, max-age=31536000, immutable')
        reply.header('ETag', generateETag(payload))
        return payload
      }
    }
  },

  // Dynamic content - short cache with revalidation
  dynamic: {
    config: {
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
        reply.header('Vary', 'Authorization, Accept-Encoding')
        return payload
      }
    }
  },

  // User-specific - private cache
  userSpecific: {
    config: {
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('Cache-Control', 'private, max-age=300')
        reply.header('Vary', 'Authorization')
        return payload
      }
    }
  },

  // No cache - sensitive data
  noCache: {
    config: {
      onSend: async function(request: _request, reply: _reply, payload) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
        reply.header('Pragma', 'no-cache')
        reply.header('Expires', '0')
        return payload
      }
    }
  }
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractUserIdFromToken(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  try {
    const token = authHeader.substring(7)
    // Simple JWT payload extraction (no verification needed for rate limiting)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    return payload.sub || payload.userId || null
  } catch {
    return null
  }
}

function generateETag(payload: unknown): string {
  // Simple hash-based ETag generation
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`
}

// ============================================================================
// ROUTE CONFIGURATION BUILDER
// ============================================================================

/**
 * Builder for combining multiple configuration concerns
 */
export class RouteConfigBuilder {
  private config: RouteOptions['config'] = {}

  withRateLimit(options: FastifyRateLimitOptions): this {
    this.config.rateLimit = options
    return this
  }

  withTimeout(connection: number, keepAlive: number = connection + 5000): this {
    this.config.connectionTimeout = connection
    this.config.keepAliveTimeout = keepAlive
    return this
  }

  withBodyLimit(bytes: number): this {
    this.config.bodyLimit = bytes
    return this
  }

  withCache(type: 'static' | 'dynamic' | 'private' | 'none'): this {
    switch (type) {
      case 'static':
        this.config.onSend = CacheConfig.static.config.onSend
        break
      case 'dynamic':
        this.config.onSend = CacheConfig.dynamic.config.onSend
        break
      case 'private':
        this.config.onSend = CacheConfig.userSpecific.config.onSend
        break
      case 'none':
        this.config.onSend = CacheConfig.noCache.config.onSend
        break
    }
    return this
  }

  withSecurity(level: 'admin' | 'public'): this {
    const securityConfig = level === 'admin' ? SecurityConfig.admin : SecurityConfig.public
    
    // Merge rate limiting
    if (securityConfig.config.rateLimit) {
      this.config.rateLimit = securityConfig.config.rateLimit
    }

    // Chain onSend handlers
    const existingOnSend = this.config.onSend
    const securityOnSend = securityConfig.config.onSend
    
    if (securityOnSend) {
      if (existingOnSend) {
        this.config.onSend = async function(request: _request, reply: _reply, payload) {
          const result = await existingOnSend.call(this, request, reply, payload)
          return await securityOnSend.call(this, request, reply, result)
        }
      } else {
        this.config.onSend = securityOnSend
      }
    }

    return this
  }

  build(): { config: RouteOptions['config'] } {
    return { config: this.config }
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Auth login route with aggressive rate limiting
 */
export const loginRouteExample = new RouteConfigBuilder()
  .withRateLimit({
    max: 3,
    timeWindow: '1 minute',
    keyGenerator: (req) => `auth_login_${req.ip}`
  })
  .withTimeout(10000)
  .withCache('none')
  .withSecurity('public')
  .build()

/**
 * Example: File upload route with specialized limits
 */
export const fileUploadRouteExample = new RouteConfigBuilder()
  .withRateLimit({
    max: 5,
    timeWindow: '1 minute'
  })
  .withTimeout(60000)
  .withBodyLimit(50 * 1024 * 1024) // 50MB
  .withCache('none')
  .build()

/**
 * Example: Dashboard API with caching
 */
export const dashboardRouteExample = new RouteConfigBuilder()
  .withRateLimit({
    max: 60,
    timeWindow: '1 minute'
  })
  .withTimeout(5000)
  .withCache('private')
  .withSecurity('public')
  .build()