import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FeatureAccessService } from '../feature-access.service'
import { FEATURE_REQUIRED_KEY } from '../decorators/feature-required.decorator'

@Injectable()
export class FeatureAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureAccessService: FeatureAccessService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_REQUIRED_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredFeature) {
      return true // No feature restriction
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user?.id) {
      throw new ForbiddenException('User authentication required')
    }

    const accessCheck = await this.featureAccessService.canUserAccessFeature(user.id, requiredFeature)

    if (!accessCheck.allowed) {
      throw new ForbiddenException({
        message: accessCheck.reason || 'Access denied',
        upgradeRequired: accessCheck.upgradeRequired || false,
        feature: requiredFeature
      })
    }

    return true
  }
}