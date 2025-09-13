import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { FastifyReply } from 'fastify'
import { Observable } from 'rxjs'

const IS_PUBLIC_KEY = 'isPublic'

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isHttp = context.getType() === 'http'
    if (!isHttp) return next.handle()

    const request = context
      .switchToHttp()
      .getRequest<{ method?: string; url?: string }>()
    const reply = context.switchToHttp().getResponse<FastifyReply>()

    // Safe Reflector access with fallback
    const isPublic = this.reflector?.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]) ?? false

    // Never cache health endpoints
    const url = request.url ?? ''
    const isHealth = url === '/health' || url.startsWith('/health/')

    if (request.method === 'GET') {
      if (isHealth) {
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      } else if (isPublic) {
        const maxAge = Number(process.env.PUBLIC_CACHE_MAX_AGE ?? 60)
        const staleWhileRevalidate = Number(process.env.PUBLIC_CACHE_SWR ?? 30)
        reply.header(
          'Cache-Control',
          `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
        )
      }
    }

    return next.handle()
  }
}
