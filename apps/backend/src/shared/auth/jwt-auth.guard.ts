/**
 * JWT Auth Guard - Supabase Authentication
 *
 * Protects routes with Supabase JWT verification
 * Follows 2025 NestJS + Supabase best practices
 */

import {
	ExecutionContext,
	Injectable,
	Logger,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { User } from '@supabase/supabase-js'

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
			context.getClass()
		])

		if (isPublic) {
			return true
		}

		return super.canActivate(context)
	}

	override handleRequest<TUser = User>(
		err: Error | null,
		user: TUser | null,
		info: { message?: string; error?: string } | null,
		context: ExecutionContext,
		status?: string | number | null
	): TUser {
		void status
		const request = context.switchToHttp().getRequest<Request>()

		// For protected routes, require authentication
		if (err || !user) {
			// Log full error details for debugging
			this.logger.warn('Authentication failed for protected route', {
				error: err instanceof Error ? err.message : 'Unknown error',
				errorName: err instanceof Error ? err.name : undefined,
				errorStack: err instanceof Error ? err.stack : undefined,
				info: info,
				path: (request as { url?: string }).url,
				method: (request as { method?: string }).method,
				hasAuthHeader: !!(request.headers as { authorization?: string }).authorization
			})
			// Throw a NestJS UnauthorizedException so the framework returns 401
			// instead of a generic 500 Internal Server Error.
			throw err instanceof UnauthorizedException
				? err
				: new UnauthorizedException('Authentication required')
		}

		this.logger.debug('Authentication successful', {
			userId: (user as { id?: string }).id,
			path: (request as { url?: string }).url,
			method: (request as { method?: string }).method
		})

		return user
	}
}
