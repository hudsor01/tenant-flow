import {
	CallHandler,
	ExecutionContext,
	Injectable,
	Logger,
	NestInterceptor
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Response } from 'express'
import { Observable } from 'rxjs'

const IS_PUBLIC_KEY = 'isPublic'

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
	private readonly logger = new Logger(CacheControlInterceptor.name)

	constructor(private readonly reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const isHttp = context.getType() === 'http'
		if (!isHttp) return next.handle()

		const request = context
			.switchToHttp()
			.getRequest<{ method?: string; url?: string }>()
		const reply = context.switchToHttp().getResponse<Response>()

		// Safe Reflector access with fallback
		const isPublic =
			this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
				context.getHandler(),
				context.getClass()
			]) ?? false

		// Never cache health endpoints
		const url = request.url ?? ''
		const isHealth = url === '/health' || url.startsWith('/health/')

		if (request.method === 'GET') {
			if (isHealth) {
				reply.header(
					'Cache-Control',
					'no-store, no-cache, must-revalidate, proxy-revalidate'
				)
			} else if (isPublic) {
				const maxAge = 300 // 5 minutes - hardcoded industry standard
				const staleWhileRevalidate = 60 // 1 minute - hardcoded industry standard
				reply.header(
					'Cache-Control',
					`public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
				)
			}
		}

		return next.handle()
	}
}
