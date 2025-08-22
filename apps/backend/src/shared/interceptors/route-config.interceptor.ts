/**
 * Route Configuration Interceptor
 * 
 * This interceptor bridges NestJS controllers with native Fastify route configurations.
 * It applies route-local settings without requiring meta-config layers.
 * 
 * INTEGRATION STRATEGY:
 * 1. Reads route configuration from method metadata
 * 2. Applies Fastify-native configuration to the route
 * 3. Maintains compatibility with existing NestJS patterns
 * 4. Provides performance optimizations per endpoint
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify'
import type { FastifyRateLimitOptions } from '@fastify/rate-limit'

export interface RouteConfig {
  rateLimit?: FastifyRateLimitOptions
  connectionTimeout?: number
  keepAliveTimeout?: number
  bodyLimit?: number
  compress?: boolean
  cache?: {
    maxAge?: number
    isPrivate?: boolean
    staleWhileRevalidate?: number
    noCache?: boolean
  }
  security?: {
    headers?: Record<string, string>
    level?: 'basic' | 'high' | 'maximum'
  }
  timing?: {
    logSlowRequests?: boolean
    slowThreshold?: number
  }
}

/**
 * Global interceptor that applies route-local configurations
 * Register in app.module.ts as APP_INTERCEPTOR
 */
@Injectable()
export class RouteConfigInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RouteConfigInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const reply = context.switchToHttp().getResponse<FastifyReply>()
    const handler = context.getHandler()

    // Get route configuration from metadata
    const routeConfig = Reflect.getMetadata('fastify:route-config', handler) as RouteConfig

    if (routeConfig) {
      this.applyRouteConfig(request, reply, routeConfig)
    }

    return next.handle().pipe(
      tap(() => {
        // Apply post-processing configurations
        this.applyPostProcessing(request, reply, routeConfig)
      })
    )
  }

  private applyRouteConfig(
    request: FastifyRequest,
    reply: FastifyReply,
    config: RouteConfig
  ): void {
    try {
      // Apply security headers
      if (config.security?.headers) {
        Object.entries(config.security.headers).forEach(([header, value]) => {
          reply.header(header, value)
        })
      }

      // Apply security level presets
      if (config.security?.level) {
        this.applySecurityLevel(reply, config.security.level)
      }

      // Apply cache headers
      if (config.cache) {
        this.applyCacheConfig(reply, config.cache)
      }

      // Store timing configuration for post-processing
      if (config.timing) {
        (request as any).routeTiming = config.timing
      }

      // Log configuration application for debugging
      this.logger.debug(`Applied route config for ${request.method} ${request.url}`, {
        hasRateLimit: !!config.rateLimit,
        hasTimeout: !!config.connectionTimeout,
        hasCaching: !!config.cache,
        securityLevel: config.security?.level
      })
    } catch (error) {
      this.logger.warn(`Failed to apply route config for ${request.url}:`, error)
    }
  }

  private applySecurityLevel(reply: FastifyReply, level: 'basic' | 'high' | 'maximum'): void {
    // Basic security headers for all levels
    reply.header('X-Content-Type-Options', 'nosniff')

    if (level === 'high' || level === 'maximum') {
      reply.header('X-Frame-Options', 'SAMEORIGIN')
      reply.header('X-XSS-Protection', '1; mode=block')
    }

    if (level === 'maximum') {
      reply.header('X-Frame-Options', 'DENY')
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
      reply.header('X-Permitted-Cross-Domain-Policies', 'none')
    }
  }

  private applyCacheConfig(reply: FastifyReply, cache: RouteConfig['cache']): void {
    if (!cache) {return}

    if (cache.noCache) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate')
      reply.header('Pragma', 'no-cache')
      reply.header('Expires', '0')
      return
    }

    const cacheDirectives: string[] = []

    // Visibility
    cacheDirectives.push(cache.isPrivate ? 'private' : 'public')

    // Max age
    if (cache.maxAge) {
      cacheDirectives.push(`max-age=${cache.maxAge}`)
    }

    // Stale while revalidate
    if (cache.staleWhileRevalidate) {
      cacheDirectives.push(`stale-while-revalidate=${cache.staleWhileRevalidate}`)
    }

    if (cacheDirectives.length > 0) {
      reply.header('Cache-Control', cacheDirectives.join(', '))
    }

    // Add Vary header for personalized content
    if (!cache.isPrivate) {
      reply.header('Vary', 'Accept-Encoding')
    } else {
      reply.header('Vary', 'Authorization, Accept-Encoding')
    }
  }

  private applyPostProcessing(
    request: FastifyRequest,
    reply: FastifyReply,
    config: RouteConfig | undefined
  ): void {
    try {
      // Apply timing analysis
      const routeTiming = (request as any).routeTiming
      if (routeTiming?.logSlowRequests) {
        const duration = Date.now() - ((request as any).startTime || Date.now())
        const threshold = routeTiming.slowThreshold || 1000

        if (duration > threshold) {
          this.logger.warn(`Slow request detected`, {
            method: request.method,
            url: request.url,
            duration: `${duration}ms`,
            threshold: `${threshold}ms`,
            statusCode: reply.statusCode
          })
        }

        // Add response time header
        reply.header('X-Response-Time', `${duration}ms`)
      }
    } catch (error) {
      this.logger.warn(`Failed to apply post-processing:`, error)
    }
  }
}

/**
 * Fastify Plugin Registration Helper
 * This helper registers route-specific configurations with the Fastify instance
 * when routes are being registered by NestJS.
 */
export class FastifyRouteConfigPlugin {
  private static logger = new Logger(FastifyRouteConfigPlugin.name)

  /**
   * Register route-specific configurations with Fastify
   * Call this from main.ts after NestJS app initialization
   */
  static async registerRouteConfigs(
    fastifyInstance: any,
    routeConfigs: Map<string, RouteConfig>
  ): Promise<void> {
    try {
      // Hook into route registration to apply configurations
      fastifyInstance.addHook('onRoute', (routeOptions: RouteOptions) => {
        const routeKey = `${routeOptions.method} ${routeOptions.url}`
        const config = routeConfigs.get(routeKey)

        if (config) {
          this.applyFastifyRouteConfig(routeOptions, config)
          this.logger.debug(`Applied Fastify config for route: ${routeKey}`)
        }
      })

      this.logger.log('Route configuration plugin registered')
    } catch (error) {
      this.logger.error('Failed to register route configuration plugin:', error)
    }
  }

  private static applyFastifyRouteConfig(
    routeOptions: RouteOptions,
    config: RouteConfig
  ): void {
    // Apply rate limiting configuration
    if (config.rateLimit) {
      routeOptions.config = routeOptions.config || {}
      routeOptions.config.rateLimit = config.rateLimit
    }

    // Apply timeout configurations
    if (config.connectionTimeout) {
      routeOptions.connectionTimeout = config.connectionTimeout
    }

    if (config.keepAliveTimeout) {
      routeOptions.keepAliveTimeout = config.keepAliveTimeout
    }

    // Apply body limit
    if (config.bodyLimit) {
      routeOptions.bodyLimit = config.bodyLimit
    }

    // Apply compression settings
    if (config.compress !== undefined) {
      routeOptions.preHandler = async function(request, reply) {
        if (!config.compress) {
          // Disable compression for this route
          request.raw.headers['accept-encoding'] = 'identity'
        }
      }
    }
  }
}

/**
 * Route Configuration Store
 * Centralized storage for route configurations that can be accessed
 * by both the interceptor and the Fastify plugin
 */
export class RouteConfigStore {
  private static configs = new Map<string, RouteConfig>()

  static setConfig(method: string, path: string, config: RouteConfig): void {
    const key = `${method.toUpperCase()} ${path}`
    this.configs.set(key, config)
  }

  static getConfig(method: string, path: string): RouteConfig | undefined {
    const key = `${method.toUpperCase()} ${path}`
    return this.configs.get(key)
  }

  static getAllConfigs(): Map<string, RouteConfig> {
    return new Map(this.configs)
  }

  static clear(): void {
    this.configs.clear()
  }
}

/**
 * Integration with NestJS Module System
 * Register the interceptor and configure route-specific settings
 */
export const ROUTE_CONFIG_PROVIDERS = [
  {
    provide: 'APP_INTERCEPTOR',
    useClass: RouteConfigInterceptor,
  }
]

/**
 * Utility functions for common route configuration patterns
 */
export class RouteConfigUtils {
  /**
   * Create authentication route configuration
   */
  static authConfig(options: {
    maxAttempts: number
    timeWindow: string
    securityLevel?: 'high' | 'maximum'
  }): RouteConfig {
    return {
      rateLimit: {
        max: options.maxAttempts,
        timeWindow: options.timeWindow,
        keyGenerator: (req) => `auth_${req.ip}`,
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Authentication Rate Limit',
          message: 'Too many authentication attempts'
        })
      },
      connectionTimeout: 15000,
      cache: { noCache: true },
      security: { level: options.securityLevel || 'maximum' },
      timing: { logSlowRequests: true, slowThreshold: 5000 }
    }
  }

  /**
   * Create file upload route configuration
   */
  static uploadConfig(options: {
    maxFiles: number
    maxSize: number
    timeWindow?: string
  }): RouteConfig {
    return {
      rateLimit: {
        max: options.maxFiles,
        timeWindow: options.timeWindow || '1 minute',
        keyGenerator: (req) => `upload_${req.ip}`
      },
      bodyLimit: options.maxSize,
      connectionTimeout: 60000,
      compress: false,
      cache: { noCache: true },
      security: { level: 'basic' }
    }
  }

  /**
   * Create cached API route configuration
   */
  static cachedApiConfig(options: {
    maxAge: number
    staleWhileRevalidate?: number
    isPrivate?: boolean
    rateLimit?: number
  }): RouteConfig {
    return {
      rateLimit: options.rateLimit ? {
        max: options.rateLimit,
        timeWindow: '1 minute'
      } : undefined,
      connectionTimeout: 10000,
      cache: {
        maxAge: options.maxAge,
        staleWhileRevalidate: options.staleWhileRevalidate,
        isPrivate: options.isPrivate
      },
      security: { level: 'basic' },
      timing: { logSlowRequests: true, slowThreshold: 2000 }
    }
  }

  /**
   * Create real-time endpoint configuration
   */
  static realtimeConfig(options: {
    maxRequests: number
    timeout?: number
  }): RouteConfig {
    return {
      rateLimit: {
        max: options.maxRequests,
        timeWindow: '1 minute',
        keyGenerator: (req) => `realtime_${req.ip}`
      },
      connectionTimeout: options.timeout || 5000,
      cache: { noCache: true },
      security: { level: 'basic' },
      timing: { logSlowRequests: true, slowThreshold: 1000 }
    }
  }
}

export {
  RouteConfig,
  RouteConfigInterceptor,
  FastifyRouteConfigPlugin,
  RouteConfigStore,
  RouteConfigUtils
}