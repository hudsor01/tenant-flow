import {
	Injectable,
	ExecutionContext,
	Logger,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { FastifyRequest } from 'fastify'

@Injectable() 
export class WebhookThrottlerGuard extends ThrottlerGuard {
	private readonly logger = new Logger(WebhookThrottlerGuard.name)

	// Stripe's official webhook IP ranges (as of 2024)
	// Source: https://stripe.com/docs/webhooks/webhook-endpoints#ip-allowlisting
	private readonly stripeIPRanges = [
		'3.18.12.63/32',
		'3.130.192.231/32',
		'13.235.14.237/32',
		'13.235.122.149/32',
		'18.211.135.69/32',
		'35.154.171.200/32',
		'52.15.183.38/32',
		'54.88.130.119/32',
		'54.88.130.237/32',
		'54.187.174.169/32',
		'54.187.205.235/32',
		'54.187.216.72/32'
	]

	constructor(private configService: ConfigService) {
		super()
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const clientIP = this.getClientIP(request)
		const requestId = `WH_THROTTLE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

		// Check if rate limiting is enabled
		const rateLimitEnabled = this.configService.get<string>('WEBHOOK_RATE_LIMIT_ENABLED', 'true') === 'true'
		if (!rateLimitEnabled) {
			this.logger.debug(`🔓 [${requestId}] Rate limiting disabled - allowing request from ${clientIP}`)
			return true
		}

		// Check if Stripe IP bypass is enabled and if IP is from Stripe
		const stripeBypassEnabled = this.configService.get<string>('WEBHOOK_STRIPE_IP_BYPASS', 'true') === 'true'
		if (stripeBypassEnabled && this.isStripeIP(clientIP)) {
			this.logger.debug(`✅ [${requestId}] Stripe IP detected (${clientIP}) - bypassing rate limit`)
			return true
		}

		// Log rate limiting attempt
		this.logger.debug(`🚦 [${requestId}] Applying rate limit to IP: ${clientIP}`)

		try {
			// Apply standard throttling for non-Stripe IPs
			const allowed = await super.canActivate(context)
			
			if (allowed) {
				this.logger.debug(`✅ [${requestId}] Rate limit check passed for IP: ${clientIP}`)
			} else {
				this.logger.warn(`🚫 [${requestId}] Rate limit exceeded for IP: ${clientIP}`)
				
				// Enhanced logging for rate limit violations
				this.logRateLimitViolation(request, clientIP, requestId)
				
				throw new HttpException(
					{
						error: 'Rate limit exceeded',
						message: 'Too many webhook requests from this IP address',
						requestId: requestId,
						clientIP: clientIP,
						timestamp: new Date().toISOString()
					},
					HttpStatus.TOO_MANY_REQUESTS
				)
			}

			return allowed
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			
			this.logger.error(`❌ [${requestId}] Rate limit check failed for IP ${clientIP}:`, {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				clientIP: clientIP,
				timestamp: new Date().toISOString()
			})
			
			throw new HttpException(
				'Rate limiting error',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	/**
	 * Extract client IP from request, considering proxy headers
	 */
	private getClientIP(request: FastifyRequest): string {
		// Check common proxy headers in order of preference
		const xForwardedFor = request.headers['x-forwarded-for']
		const xRealIP = request.headers['x-real-ip']
		const cfConnectingIP = request.headers['cf-connecting-ip']
		
		// X-Forwarded-For can contain multiple IPs, take the first one
		if (xForwardedFor) {
			const ips = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor
			return ips.split(',')[0].trim()
		}
		
		// X-Real-IP is usually a single IP
		if (xRealIP) {
			return Array.isArray(xRealIP) ? xRealIP[0] : xRealIP
		}
		
		// CloudFlare connecting IP
		if (cfConnectingIP) {
			return Array.isArray(cfConnectingIP) ? cfConnectingIP[0] : cfConnectingIP
		}
		
		// Fall back to connection remote address
		return request.ip || request.socket?.remoteAddress || '0.0.0.0'
	}

	/**
	 * Check if IP is in Stripe's known IP ranges
	 */
	private isStripeIP(ip: string): boolean {
		try {
			for (const range of this.stripeIPRanges) {
				if (this.isIPInCIDR(ip, range)) {
					return true
				}
			}
			return false
		} catch (error) {
			this.logger.error(`Failed to check Stripe IP for ${ip}:`, error)
			return false
		}
	}

	/**
	 * Check if IP is within CIDR range
	 */
	private isIPInCIDR(ip: string, cidr: string): boolean {
		const [subnet, bits] = cidr.split('/')
		const subnetLong = this.ipToLong(subnet)
		const ipLong = this.ipToLong(ip)
		const mask = -1 << (32 - parseInt(bits))
		
		return (subnetLong & mask) === (ipLong & mask)
	}

	/**
	 * Convert IP address to long integer
	 */
	private ipToLong(ip: string): number {
		const parts = ip.split('.').map(part => parseInt(part, 10))
		return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
	}

	/**
	 * Log detailed information about rate limit violations for monitoring
	 */
	private logRateLimitViolation(request: FastifyRequest, clientIP: string, requestId: string): void {
		this.logger.warn(`🚨 [${requestId}] Rate limit violation detected:`, {
			clientIP: clientIP,
			userAgent: request.headers['user-agent'] || 'Unknown',
			method: request.method,
			url: request.url,
			headers: {
				'content-type': request.headers['content-type'],
				'content-length': request.headers['content-length'],
				'x-forwarded-for': request.headers['x-forwarded-for'],
				'x-real-ip': request.headers['x-real-ip'],
				'cf-connecting-ip': request.headers['cf-connecting-ip']
			},
			timestamp: new Date().toISOString(),
			requestId: requestId
		})
	}

	/**
	 * Override the default key generator to use IP-based throttling
	 */
	protected generateKey(context: ExecutionContext, suffix: string): string {
		const request = context.switchToHttp().getRequest<FastifyRequest>()
		const clientIP = this.getClientIP(request)
		return `webhook_throttle:${clientIP}:${suffix}`
	}
}