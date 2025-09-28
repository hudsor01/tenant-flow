/**
 * JWT Auth Guard - Supabase Authentication
 *
 * Protects routes with Supabase JWT verification
 * Follows 2025 NestJS + Supabase best practices
 */

import { Injectable, ExecutionContext, Logger } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'

@Injectable()
export class JwtAuthGuard extends AuthGuard('supabase') {
  private readonly logger = new Logger(JwtAuthGuard.name)

  constructor(private reflector: Reflector) {
    super()
  }

  override canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    // Use Passport JWT authentication
    return super.canActivate(context)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override handleRequest(err: any, user: any, _info: any, context: ExecutionContext): any {
    const request = context.switchToHttp().getRequest<Request>()

    // If there's an error or no user, but route is public, allow access
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic && (!user || err)) {
      this.logger.debug('Public route accessed without authentication', {
        path: (request as { url?: string }).url,
        method: (request as { method?: string }).method
      })
      return null // Allow public access
    }

    // For protected routes, require authentication
    if (err || !user) {
      this.logger.warn('Authentication failed for protected route', {
        error: err instanceof Error ? err.message : 'Unknown error',
        path: (request as { url?: string }).url,
        method: (request as { method?: string }).method
      })
      throw err || new Error('Authentication required')
    }

    this.logger.debug('Authentication successful', {
      userId: (user as { id?: string }).id,
      path: (request as { url?: string }).url,
      method: (request as { method?: string }).method
    })

    return user
  }
}