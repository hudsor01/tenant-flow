import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { FastifyRequest, FastifyReply } from 'fastify'
import { CorsSecurityService } from '../security/cors-security.service'

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorsInterceptor.name)

  constructor(private readonly corsSecurityService: CorsSecurityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>()
    const response = context.switchToHttp().getResponse<FastifyReply>()
    
    const origin = this.getOriginFromRequest(request)
    const userAgent = request.headers['user-agent']
    const ip = this.getClientIp(request)
    const method = request.method

    // Handle CORS validation
    if (origin) {
      const isValidOrigin = this.corsSecurityService.validateOrigin(origin, userAgent, ip)
      
      if (!isValidOrigin) {
        this.logger.warn(`CORS validation failed for origin: ${origin}`, {
          ip,
          userAgent,
          method
        })
        
        response.status(403).send({
          error: 'Forbidden',
          message: 'Origin not allowed by CORS policy',
          statusCode: 403
        })
        return new Observable(subscriber => subscriber.complete())
      }

      // Get CORS headers for this origin
      const corsHeaders = this.corsSecurityService.getCorsHeaders(origin, method)
      
      // Apply CORS headers to response
      Object.entries(corsHeaders).forEach(([header, value]) => {
        response.header(header, value)
      })

      this.logger.debug(`CORS headers applied for origin: ${origin}`, {
        headers: Object.keys(corsHeaders),
        method
      })
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      this.logger.debug(`Handling CORS preflight request from origin: ${origin}`)
      
      response.status(204).send()
      return new Observable(subscriber => subscriber.complete())
    }

    return next.handle().pipe(
      map(data => {
        // Log successful CORS request
        if (origin) {
          this.logger.debug(`CORS request completed successfully`, {
            origin,
            method,
            statusCode: response.statusCode
          })
        }
        return data
      })
    )
  }

  private getOriginFromRequest(request: FastifyRequest): string | undefined {
    // Check Origin header first
    const origin = request.headers.origin
    if (origin) {
      return origin
    }

    // Fallback to Referer header
    const referer = request.headers.referer
    if (referer) {
      try {
        const url = new URL(referer)
        return `${url.protocol}//${url.host}`
      } catch {
        // Invalid referer URL, ignore
      }
    }

    return undefined
  }

  private getClientIp(request: FastifyRequest): string {
    // Check common proxy headers
    const forwardedFor = request.headers['x-forwarded-for']
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0]
      return ips?.trim() || 'unknown'
    }

    const realIp = request.headers['x-real-ip']
    if (realIp && typeof realIp === 'string') {
      return realIp
    }

    const cfConnectingIp = request.headers['cf-connecting-ip']
    if (cfConnectingIp && typeof cfConnectingIp === 'string') {
      return cfConnectingIp
    }

    // Fallback to connection remote address
    return request.ip || request.socket.remoteAddress || 'unknown'
  }
}