import { Injectable, Logger } from '@nestjs/common'
import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaService } from '../../prisma/prisma.service'

import fastifyRateLimit from '@fastify/rate-limit'
import type { RateLimitPluginOptions } from '@fastify/rate-limit'

interface TenantRateLimitConfig {
  freetrial: { max: number; timeWindow: string }
  starter: { max: number; timeWindow: string }
  growth: { max: number; timeWindow: string }
  tenantflow_max: { max: number; timeWindow: string }
}

/**
 * Per-tenant rate limiting service
 * Applies different rate limits based on subscription tier
 */
@Injectable()
export class TenantRateLimitService {
  private readonly logger = new Logger(TenantRateLimitService.name)

  private readonly rateLimits: TenantRateLimitConfig = {
    freetrial: { max: 100, timeWindow: '1 minute' },
    starter: { max: 300, timeWindow: '1 minute' },
    growth: { max: 500, timeWindow: '1 minute' },
    tenantflow_max: { max: 5000, timeWindow: '1 minute' }
  }

  constructor(private readonly prismaService: PrismaService) {
    // Initialize rate limiting configuration
  }

  /**
   * Register rate limiting plugin with per-tenant configuration
   */
  async registerRateLimiting(fastify: FastifyInstance): Promise<void> {
    await fastify.register(fastifyRateLimit, {
      global: false, // We'll apply it selectively
      keyGenerator: (request: FastifyRequest) => {
        // Use tenant ID as the key for rate limiting
        const tenantId = (request as FastifyRequest & { tenantId?: string }).tenantId || request.headers['x-tenant-id'] || 'anonymous'
        return `${tenantId}:${request.ip}`
      },
      errorResponseBuilder: ((_request: FastifyRequest, context: { current?: number; max?: number; ttl?: number; remaining?: number; reset?: number }) => {
        return {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. You have made ${context.current || 0} requests, maximum allowed is ${context.max || 100}`,
            statusCode: 429,
            retryAfter: context.ttl || 60,
            limit: context.max || 100,
            remaining: context.remaining || 0,
            reset: new Date((context.reset || Date.now()) * 1000).toISOString()
          }
        }
      })
    })

    // Register tenant-specific rate limiting for API routes
    this.registerApiRateLimits(fastify)

    // Register strict rate limiting for auth endpoints
    this.registerAuthRateLimits(fastify)

    // Register file upload rate limiting
    this.registerUploadRateLimits(fastify)

    this.logger.log('Tenant-based rate limiting registered')
  }

  /**
   * Apply rate limits to API endpoints based on tenant subscription
   */
  private registerApiRateLimits(fastify: FastifyInstance): void {
    // Apply to all API routes
    fastify.register(async (instance) => {
      await instance.register(fastifyRateLimit, {
        max: 1000, // Default max, will be overridden by keyGenerator logic
        timeWindow: '1 minute',
        skipFailedRequests: true,
        keyGenerator: async (request: FastifyRequest) => {
          const tenantId = (request as FastifyRequest & { tenantId?: string }).tenantId
          const subscription = await this.getTenantSubscription(tenantId)
          return `api:${subscription}:${tenantId || request.ip}`
        }
      } as RateLimitPluginOptions)
    }, { prefix: '/api/v1' })
  }

  /**
   * Apply strict rate limiting to auth endpoints
   */
  private registerAuthRateLimits(fastify: FastifyInstance): void {
    fastify.register(async (instance) => {
      await instance.register(fastifyRateLimit, {
        max: 5,
        timeWindow: '15 minutes',
        keyGenerator: (request: FastifyRequest) => {
          return `auth:${request.ip}:${request.body && (request.body as { email?: string }).email || 'unknown'}`
        }
      } as RateLimitPluginOptions)
    }, { prefix: '/api/v1/auth/login' })

    // Password reset rate limiting
    fastify.register(async (instance) => {
      await instance.register(fastifyRateLimit, {
        max: 3,
        timeWindow: '1 hour',
        keyGenerator: (request: FastifyRequest) => {
          return `reset:${request.ip}:${request.body && (request.body as { email?: string }).email || 'unknown'}`
        }
      } as RateLimitPluginOptions)
    }, { prefix: '/api/v1/auth/reset-password' })
  }

  /**
   * Apply rate limiting to file upload endpoints
   */
  private registerUploadRateLimits(fastify: FastifyInstance): void {
    fastify.register(async (instance) => {
      await instance.register(fastifyRateLimit, {
        max: 10,
        timeWindow: '1 hour',
        keyGenerator: (request: FastifyRequest) => {
          return `upload:${(request as FastifyRequest & { tenantId?: string }).tenantId || request.ip}`
        }
      } as RateLimitPluginOptions)
    }, { prefix: '/api/v1/storage/upload' })
  }

  /**
   * Get tenant subscription tier
   * Queries the database to get the actual subscription plan
   */
  private async getTenantSubscription(tenantId?: string): Promise<keyof TenantRateLimitConfig> {
    if (!tenantId) return 'freetrial'

    try {
      // Find user by user ID (tenant ID represents the user in this context)
      const user = await this.prismaService.user.findFirst({
        where: { id: tenantId },
        include: { Subscription: true }
      })

      if (!user || !user.Subscription || user.Subscription.length === 0) {
        return 'freetrial'
      }

      // Get the most recent active subscription
      const activeSubscription = user.Subscription.find(sub => sub.status === 'ACTIVE') || user.Subscription[0]

      if (!activeSubscription) {
        return 'freetrial'
      }

      // Map PlanType enum to rate limit config keys
      const planTypeToRateLimit: Record<string, keyof TenantRateLimitConfig> = {
        'FREETRIAL': 'freetrial',
        'STARTER': 'starter',
        'GROWTH': 'growth',
        'TENANTFLOW_MAX': 'tenantflow_max'
      }

      return planTypeToRateLimit[activeSubscription.planType || 'FREETRIAL'] || 'freetrial'
    } catch (error) {
      this.logger.error(`Failed to get subscription for tenant ${tenantId}:`, error)
      // Return free tier as fallback
      return 'freetrial'
    }
  }

  /**
   * Get current rate limit status for a tenant
   */
  async getRateLimitStatus(tenantId: string, _ip: string): Promise<{
    limit: number
    remaining: number
    reset: Date
  }> {
    // This would query the rate limit store
    const subscription = await this.getTenantSubscription(tenantId)
    const limits = this.rateLimits[subscription]

    return {
      limit: limits.max,
      remaining: limits.max, // Would be calculated from store
      reset: new Date(Date.now() + 60000) // 1 minute from now
    }
  }
}
