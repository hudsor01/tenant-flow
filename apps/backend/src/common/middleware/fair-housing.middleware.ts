import { Injectable, NestMiddleware } from '@nestjs/common'
import { FastifyRequest, FastifyReply } from 'fastify'
import { FairHousingService } from '../security/fair-housing.service'
import { AuthUser } from '@repo/shared'

interface AuthenticatedRequest extends FastifyRequest {
  user?: AuthUser
}

/**
 * Fair Housing Compliance Middleware
 * 
 * Automatically validates requests for Fair Housing Act compliance
 * Applied to tenant and property management endpoints
 */
@Injectable()
export class FairHousingMiddleware implements NestMiddleware {
  constructor(private readonly fairHousingService: FairHousingService) {}

  async use(req: AuthenticatedRequest, _res: FastifyReply, next: (error?: Error) => void): Promise<void> {
    try {
      // Only validate POST and PUT requests with data
      if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body) {
        return next()
      }

      const userId = req.user?.id || 'anonymous'
      const ipAddress = req.ip || req.raw.socket?.remoteAddress

      // Validate based on endpoint type
      if (req.url.includes('/tenants')) {
        await this.fairHousingService.validateTenantData(req.body as Record<string, unknown>, userId, ipAddress)
      } else if (req.url.includes('/properties')) {
        await this.fairHousingService.validatePropertyListing(req.body as Record<string, unknown>, userId, ipAddress)
      }

      next()
    } catch (error) {
      // Error is already properly formatted by FairHousingService
      next(error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}