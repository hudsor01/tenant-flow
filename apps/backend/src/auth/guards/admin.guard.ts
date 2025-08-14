import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import type { User } from '@repo/database'

/**
 * Guard that ensures only admin users can access protected routes
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user: User = request.user

    if (!user) {
      return false
    }

    return user.role === 'ADMIN'
  }
}