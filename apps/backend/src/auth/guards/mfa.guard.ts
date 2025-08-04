import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SecurityAuditService } from '../../common/security/audit.service'
import { SecurityEventType } from '@tenantflow/shared'

/**
 * Multi-Factor Authentication Guard
 * 
 * MVP implementation requiring MFA verification for admin operations
 * Checks for MFA token in request headers for sensitive operations
 */
@Injectable()
export class MfaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: SecurityAuditService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if MFA is required for this endpoint
    const requiresMfa = this.reflector.getAllAndOverride<boolean>('requiresMfa', [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiresMfa) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request['user']
    const mfaToken = request.headers['x-mfa-token']
    const ipAddress = request.ip

    // Check if user is admin (requires MFA)
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
    
    if (isAdmin && !mfaToken) {
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.PERMISSION_DENIED,
        userId: user?.id,
        ipAddress,
        resource: request.path,
        action: 'mfa_required',
        details: JSON.stringify({
          reason: 'MFA token required for admin operation',
          userRole: user?.role,
          endpoint: request.path
        })
      })

      throw new UnauthorizedException('MFA verification required for this operation')
    }

    // For MVP, we'll do basic token validation
    // In production, integrate with proper MFA service (TOTP, SMS, etc.)
    if (isAdmin && !this.validateMfaToken(mfaToken, user.id)) {
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.AUTH_FAILURE,
        userId: user?.id,
        ipAddress,
        resource: request.path,
        action: 'mfa_validation_failed',
        details: JSON.stringify({
          reason: 'Invalid MFA token',
          userRole: user?.role,
          endpoint: request.path
        })
      })

      throw new UnauthorizedException('Invalid MFA token')
    }

    // Log successful MFA validation
    if (isAdmin) {
      await this.auditService.logSecurityEvent({
        eventType: SecurityEventType.AUTH_SUCCESS,
        userId: user?.id,
        ipAddress,
        resource: request.path,
        action: 'mfa_validated',
        details: JSON.stringify({
          userRole: user?.role,
          endpoint: request.path
        })
      })
    }

    return true
  }

  /**
   * Basic MFA token validation for MVP
   * In production, replace with proper TOTP/SMS validation
   */
  private validateMfaToken(token: string, userId: string): boolean {
    if (!token || !userId) return false

    // MVP: Check for a valid format (6 digits)
    const isValidFormat = /^\d{6}$/.test(token)
    
    // TODO: Replace with actual MFA validation
    // - TOTP verification using authenticator apps
    // - SMS code verification
    // - Hardware key validation
    // - Time-based token validation
    
    return isValidFormat
  }
}

/**
 * Decorator to mark endpoints as requiring MFA
 */
export const RequiresMfa = () => {
  return (target: object, _propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('requiresMfa', true, descriptor.value)
    } else {
      Reflect.defineMetadata('requiresMfa', true, target)
    }
  }
}