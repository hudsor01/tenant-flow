/**
 * Sentry Context Middleware
 *
 * Automatically enriches Sentry events with user/tenant context from authenticated requests.
 * Sets user identity, tenant tags, and request context for better error correlation.
 *
 * **Execution Order**: Should run AFTER RequestIdMiddleware to include requestId in context.
 *
 * **Official NestJS Pattern**:
 * @see {@link https://docs.nestjs.com/middleware#middleware NestJS Middleware Documentation}
 *
 * @example
 * ```typescript
 * // In AppModule.configure()
 * consumer
 *   .apply(RequestTimingMiddleware, RequestIdMiddleware, SentryContextMiddleware, RequestLoggerMiddleware)
 *   .forRoutes('*')
 * ```
 */
import type { NestMiddleware } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import * as Sentry from '@sentry/nestjs'
import { ClsService } from 'nestjs-cls'

interface AuthenticatedRequest extends Request {
	user?: {
		sub?: string
		user_id?: string
		email?: string
		user_metadata?: {
			tenant_id?: string
		}
		app_metadata?: {
			role?: string
		}
	}
}

@Injectable()
export class SentryContextMiddleware implements NestMiddleware {
	constructor(private readonly cls: ClsService) {}

	/**
	 * Middleware handler that sets Sentry context for each request
	 *
	 * @param req - Express request object (may include user from JWT auth)
	 * @param _res - Express response object (unused)
	 * @param next - Express next function to pass control to next middleware
	 */
	use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
		const requestContext = this.cls.get('REQUEST_CONTEXT') as
			| Record<string, unknown>
			| undefined
		const requestId = requestContext?.requestId as string | undefined

		// Set request context on Sentry scope
		Sentry.setContext('http_request', {
			method: req.method,
			path: req.path,
			url: req.url,
			requestId,
			ip: req.ip,
			userAgent: req.get('user-agent')
		})

		// Set user context if authenticated
		if (req.user) {
			const userId = req.user.sub || req.user.user_id
			const tenantId = req.user.user_metadata?.tenant_id

			if (userId) {
				Sentry.setUser({
					id: userId,
					...(req.user.email && { email: req.user.email })
				})
			}

			if (tenantId) {
				Sentry.setTag('tenant_id', tenantId)
			}

			if (req.user.app_metadata?.role) {
				Sentry.setTag('user_role', req.user.app_metadata.role)
			}
		}

		// Set request ID as tag for filtering
		if (requestId) {
			Sentry.setTag('request_id', requestId)
		}

		next()
	}
}
