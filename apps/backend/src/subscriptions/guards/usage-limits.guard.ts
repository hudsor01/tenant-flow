import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FeatureAccessService } from '../feature-access.service'
import { USAGE_LIMIT_KEY, UsageLimitConfig } from '../decorators/usage-limits.decorator'

@Injectable()
export class UsageLimitsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureAccessService: FeatureAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitConfig = this.reflector.getAllAndOverride<UsageLimitConfig>(USAGE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!limitConfig) {
      return true // No usage limit
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user?.id) {
      throw new ForbiddenException('User authentication required')
    }

    const limits = await this.featureAccessService.enforceFeatureLimits(user.id)

    switch (limitConfig.resource) {
      case 'properties':
        if (limits.propertiesAtLimit && limitConfig.action === 'create') {
          throw new ForbiddenException({
            message: limitConfig.message || 'Property limit reached. Upgrade your plan to add more properties.',
            limitType: 'properties',
            upgradeRequired: true
          })
        }
        break

      case 'storage':
        if (limits.storageAtLimit && limitConfig.action === 'upload') {
          throw new ForbiddenException({
            message: limitConfig.message || 'Storage limit reached. Upgrade your plan for more storage.',
            limitType: 'storage', 
            upgradeRequired: true
          })
        }
        break

      case 'units':
        // Units limit would be checked against the property they're trying to add to
        // This would need additional logic to count existing units for that property
        break
    }

    return true
  }
}