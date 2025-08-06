import { Injectable, ExecutionContext } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { FastifyRequest } from 'fastify'
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator'

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: FastifyRequest): Promise<string> {
    return req.ip || req.raw.socket?.remoteAddress || 'unknown'
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for routes marked with @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])
    
    return isPublic || false
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get custom rate limit from decorator if present
    const customLimit = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler()
    )

    if (customLimit) {
      // Temporarily override throttle options for this request
      const originalOptions = (this as unknown as { options: { ttl: number; limit: number }[] }).options
      ;(this as unknown as { options: { ttl: number; limit: number }[] }).options = [{
        ttl: customLimit.ttl,
        limit: customLimit.limit
      }]
      
      try {
        return await super.canActivate(context)
      } finally {
        // Restore original options
        ;(this as unknown as { options: { ttl: number; limit: number }[] }).options = originalOptions
      }
    }

    // Fall back to default throttler behavior
    return super.canActivate(context)
  }
}