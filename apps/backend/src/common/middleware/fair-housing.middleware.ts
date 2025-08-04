import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { FairHousingService } from '../security/fair-housing.service'

/**
 * Fair Housing Compliance Middleware
 * 
 * Automatically validates requests for Fair Housing Act compliance
 * Applied to tenant and property management endpoints
 */
@Injectable()
export class FairHousingMiddleware implements NestMiddleware {
  constructor(private readonly fairHousingService: FairHousingService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Only validate POST and PUT requests with data
      if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body) {
        return next()
      }

      const userId = req['user']?.id || 'anonymous'
      const ipAddress = req.ip || req.connection.remoteAddress

      // Validate based on endpoint type
      if (req.path.includes('/tenants')) {
        await this.fairHousingService.validateTenantData(req.body, userId, ipAddress)
      } else if (req.path.includes('/properties')) {
        await this.fairHousingService.validatePropertyListing(req.body, userId, ipAddress)
      }

      next()
    } catch (error) {
      // Error is already properly formatted by FairHousingService
      next(error)
    }
  }
}