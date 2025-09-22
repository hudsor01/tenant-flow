import {
	CanActivate,
	ExecutionContext,
	Injectable,
	SetMetadata,
	UnauthorizedException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'

@Injectable()
export class CsrfGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		// Check if route is exempt from CSRF protection
		const isExempt = this.reflector.getAllAndOverride<boolean>(
			CSRF_EXEMPT_KEY,
			[context.getHandler(), context.getClass()]
		)

		if (isExempt) {
			return true
		}

		const request = context.switchToHttp().getRequest<Request>()
		const method = request.method.toUpperCase()

		// Skip CSRF for safe methods
		const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE']
		if (safeMethods.includes(method)) {
			return true
		}

		// Production CSRF protection: validate CSRF token
		const csrfToken =
			(request.headers['x-csrf-token'] as string) ||
			(request.headers['x-xsrf-token'] as string)

		const referer = request.headers.referer || request.headers.origin
		const origin = request.headers.origin as string

		// Validate origin against allowed origins
		const allowedOrigins = [
			'https://tenantflow.app',
			'https://www.tenantflow.app',
			process.env.CORS_ORIGINS?.split(',') || []
		]
			.flat()
			.filter(Boolean)

		const isValidOrigin =
			origin &&
			allowedOrigins.some(
				allowed => origin === allowed || origin.endsWith(allowed)
			)

		// Require either CSRF token or valid origin/referer
		if (!csrfToken && !isValidOrigin) {
			throw new UnauthorizedException(
				'CSRF protection: Invalid origin or missing token'
			)
		}

		// Additional referer check for extra security
		if (referer && !isValidOrigin) {
			try {
				const refererUrl = new URL(referer)
				const isValidReferer = allowedOrigins.some(
					allowed =>
						refererUrl.origin === allowed ||
						refererUrl.hostname.endsWith(allowed)
				)
				if (!isValidReferer) {
					throw new UnauthorizedException(
						'CSRF protection: Invalid referer'
					)
				}
			} catch {
				throw new UnauthorizedException(
					'CSRF protection: Invalid referer format'
				)
			}
		}

		return true
	}
}

// Decorator to exempt routes from CSRF protection
export const CSRF_EXEMPT_KEY = 'csrfExempt'
export const CsrfExempt = () => SetMetadata(CSRF_EXEMPT_KEY, true)
