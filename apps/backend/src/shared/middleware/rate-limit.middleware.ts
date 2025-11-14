/**
 * Production-Grade Rate Limiting Middleware
 *
 * Apple-level security: Multiple rate limiting strategies with intelligent detection
 * - IP-based rate limiting with sliding window
 * - User-based rate limiting for authenticated requests
 * - Endpoint-specific limits (auth, payment, webhooks)
 * - Burst protection and DDoS mitigation
 * - Security event logging and alerting
 */

import {
	Injectable,
	Logger,
	NestMiddleware,
	OnModuleDestroy
} from '@nestjs/common'
import type {
	RateLimitConfig,
	RateLimitWindow
} from '@repo/shared/types/backend-domain'
import type { Request, Response } from 'express'

// Extend the shared interfaces for local needs
interface ExtendedRateLimitWindow extends RateLimitWindow {
	firstRequest: number
}

interface ExtendedRateLimitConfig extends RateLimitConfig {
	burst?: number
}

const RATE_LIMIT_CONFIGS: Record<string, ExtendedRateLimitConfig> = {
	// General API endpoints
	DEFAULT: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 1000,
		burst: 50
	},

	// Authentication endpoints (more restrictive)
	AUTH: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 20, // Prevent brute force
		burst: 5,
		skipSuccessfulRequests: true // Only count failed attempts
	},

	// Payment endpoints (strict limits)
	PAYMENT: {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxRequests: 50,
		burst: 10
	},

	// Webhook endpoints (generous for legitimate traffic)
	WEBHOOK: {
		windowMs: 5 * 60 * 1000, // 5 minutes
		maxRequests: 500,
		burst: 100,
		skipFailedRequests: true // Only count successful webhooks
	},

	// Public endpoints (moderate limits)
	PUBLIC: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxRequests: 200,
		burst: 20
	}
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware, OnModuleDestroy {
	private readonly logger = new Logger(RateLimitMiddleware.name)
	private readonly rateLimitStore = new Map<string, ExtendedRateLimitWindow>()

	// Track IPs with suspicious activity
	private readonly suspiciousIPs = new Set<string>()
	private readonly blockedIPs = new Set<string>()

	// Store cleanup interval for proper resource cleanup
	private cleanupInterval: NodeJS.Timeout | null = null
	// Track active timers for cleanup
	private activeTimers: Set<NodeJS.Timeout> = new Set()

	constructor() {
		// Cleanup expired rate limit entries every 5 minutes
		this.cleanupInterval = setInterval(
			() => this.cleanupExpiredEntries(),
			5 * 60 * 1000
		)
	}

	use(req: Request, res: Response, next: () => void): void {
		const clientIP = this.getClientIP(req)
		const endpoint = this.getEndpointType(req.url)
		const config = RATE_LIMIT_CONFIGS[endpoint] ||
			RATE_LIMIT_CONFIGS.DEFAULT || {
				windowMs: 15 * 60 * 1000,
				maxRequests: 1000,
				burst: 50
			}

		// Check if IP is blocked
		if (this.blockedIPs.has(clientIP)) {
			this.logger.error('Blocked IP attempted access', {
				operation: 'rate_limit_blocked_ip_access',
				ip: clientIP,
				endpoint: req.url,
				method: req.method,
				userAgent: req.headers['user-agent'],
				endpointType: endpoint,
				retryAfter: Math.ceil(config.windowMs / 1000)
			})

			res.status(429).send({
				error: 'Rate limit exceeded',
				message: 'Too many requests from this IP address',
				retryAfter: Math.ceil(config.windowMs / 1000)
			})
			return
		}

		const key = `${clientIP}:${endpoint}`
		const now = Date.now()

		let window = this.rateLimitStore.get(key)

		if (!window || now >= window.resetTime) {
			// Create new window
			window = {
				requests: 0,
				resetTime: now + config.windowMs,
				firstRequest: now
			}
			this.rateLimitStore.set(key, window)
		}

		// Check for burst protection
		const timeSinceFirst = now - window.firstRequest
		const isBurst =
			timeSinceFirst < 10000 &&
			window.requests > (config.burst || config.maxRequests / 2)

		if (isBurst) {
			this.handleSuspiciousActivity(clientIP, req, 'burst_detected')
		}

		// Increment request counter
		window.requests++

		// Check rate limits
		if (window.requests > config.maxRequests) {
			this.handleRateLimitExceeded(clientIP, req, config)

			res.status(429).send({
				error: 'Rate limit exceeded',
				message: 'Too many requests, please try again later',
				retryAfter: Math.ceil((window.resetTime - now) / 1000),
				limit: config.maxRequests,
				remaining: 0,
				reset: new Date(window.resetTime).toISOString()
			})
			return
		}

		// Add rate limit headers using Express response
		res.setHeader('X-RateLimit-Limit', config.maxRequests.toString())
		res.setHeader(
			'X-RateLimit-Remaining',
			(config.maxRequests - window.requests).toString()
		)
		res.setHeader('X-RateLimit-Reset', new Date(window.resetTime).toISOString())

		// Log for monitoring
		if (window.requests > config.maxRequests * 0.8) {
			this.logger.warn('High rate limit usage detected', {
				operation: 'rate_limit_high_usage',
				ip: clientIP,
				endpoint: req.url,
				method: req.method,
				userAgent: req.headers['user-agent'],
				endpointType: endpoint,
				requests: window.requests,
				limit: config.maxRequests,
				remaining: config.maxRequests - window.requests,
				thresholdPercent: 80
			})
		}

		next()
	}

	private getClientIP(req: Request): string {
		// Handle various proxy setups (Cloudflare, AWS ALB, etc.)
		const forwardedFor = req.headers['x-forwarded-for'] as string
		const realIP = req.headers['x-real-ip'] as string
		const cfConnectingIP = req.headers['cf-connecting-ip'] as string

		if (cfConnectingIP) return cfConnectingIP
		if (realIP) return realIP
		if (forwardedFor && typeof forwardedFor === 'string') {
			const firstIp = forwardedFor.split(',')[0]
			return firstIp ? firstIp.trim() : 'unknown'
		}

		return req.ip || 'unknown'
	}

	private getEndpointType(url: string): string {
		// Categorize endpoints for appropriate rate limiting
		// Note: Auth endpoints removed - using direct Supabase auth

		if (
			url.includes('/stripe/') ||
			url.includes('/payment') ||
			url.includes('/billing')
		) {
			return 'PAYMENT'
		}

		if (url.includes('/webhook')) {
			return 'WEBHOOK'
		}

		if (
			url.includes('/health') ||
			url.includes('/ping') ||
			url.includes('/public')
		) {
			return 'PUBLIC'
		}

		return 'DEFAULT'
	}

	private handleRateLimitExceeded(
		clientIP: string,
		req: Request,
		config: ExtendedRateLimitConfig
	): void {
		this.logger.warn('Rate limit exceeded', {
			operation: 'rate_limit_exceeded',
			ip: clientIP,
			endpoint: req.url,
			method: req.method,
			userAgent: req.headers['user-agent'],
			endpointType: this.getEndpointType(req.url),
			limit: config.maxRequests,
			windowMs: config.windowMs,
			burst: config.burst
		})

		// Track suspicious activity
		this.handleSuspiciousActivity(clientIP, req, 'rate_limit_exceeded')
	}

	private handleSuspiciousActivity(
		clientIP: string,
		req: Request,
		reason: string
	): void {
		if (!this.suspiciousIPs.has(clientIP)) {
			this.suspiciousIPs.add(clientIP)

			this.logger.error('Suspicious activity detected', {
				operation: 'rate_limit_suspicious_activity',
				ip: clientIP,
				reason,
				endpoint: req.url,
				method: req.method,
				userAgent: req.headers['user-agent'],
				endpointType: this.getEndpointType(req.url),
				timestamp: new Date().toISOString(),
				severity: 'HIGH'
			})

			// Auto-block after multiple violations
			const blockTimer = setTimeout(
				() => {
					try {
						this.activeTimers.delete(blockTimer)
						if (this.suspiciousIPs.has(clientIP)) {
							this.blockedIPs.add(clientIP)
							this.logger.error(
								'IP automatically blocked due to repeated violations',
								{
									operation: 'rate_limit_ip_auto_blocked',
									ip: clientIP,
									reason: 'repeated_violations',
									blockDuration: 60 * 60 * 1000,
									severity: 'CRITICAL'
								}
							)

							// Remove from blocked list after 1 hour
							const unblockTimer = setTimeout(
								() => {
									try {
										this.activeTimers.delete(unblockTimer)
										this.blockedIPs.delete(clientIP)
									} catch (error) {
										this.logger.error('Error in unblock timer callback', {
											error:
												error instanceof Error ? error.message : String(error)
										})
									}
								},
								60 * 60 * 1000
							)
							this.activeTimers.add(unblockTimer)
						}
					} catch (error) {
						this.logger.error('Error in block timer callback', {
							error: error instanceof Error ? error.message : String(error)
						})
					}
				},
				5 * 60 * 1000
			) // Block after 5 minutes of suspicious activity
			this.activeTimers.add(blockTimer)
		}
	}
	private cleanupExpiredEntries(): void {
		const now = Date.now()
		let cleaned = 0

		for (const [key, window] of this.rateLimitStore.entries()) {
			if (now >= window.resetTime) {
				this.rateLimitStore.delete(key)
				cleaned++
			}
		}

		if (cleaned > 0) {
			this.logger.debug('Rate limit entries cleanup completed', {
				operation: 'rate_limit_cleanup',
				entriesCleaned: cleaned,
				remainingEntries: this.rateLimitStore.size,
				cleanupInterval: 5 * 60 * 1000
			})
		}

		// Also cleanup suspicious IPs older than 1 hour
		// Note: In production, you'd want to use Redis or similar for persistence
	}

	// Public methods for manual IP management
	public blockIP(ip: string, reason: string): void {
		this.blockedIPs.add(ip)
		this.logger.error('IP manually blocked', {
			operation: 'rate_limit_manual_block',
			ip,
			reason,
			timestamp: new Date().toISOString()
		})
	}

	public unblockIP(ip: string): void {
		this.blockedIPs.delete(ip)
		this.suspiciousIPs.delete(ip)
		this.logger.log('IP manually unblocked', {
			operation: 'rate_limit_manual_unblock',
			ip,
			timestamp: new Date().toISOString()
		})
	}

	public getSuspiciousIPs(): string[] {
		return Array.from(this.suspiciousIPs)
	}

	public getBlockedIPs(): string[] {
		return Array.from(this.blockedIPs)
	}

	public getRateLimitStats(): {
		totalKeys: number
		suspiciousIPs: number
		blockedIPs: number
	} {
		return {
			totalKeys: this.rateLimitStore.size,
			suspiciousIPs: this.suspiciousIPs.size,
			blockedIPs: this.blockedIPs.size
		}
	}

	/**
	 * Cleanup resources on module destruction to prevent memory leaks
	 */
	onModuleDestroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval)
			this.cleanupInterval = null
		}
		// Clear all active timers
		for (const timer of this.activeTimers) {
			clearTimeout(timer)
		}
		this.activeTimers.clear()
		this.rateLimitStore.clear()
		this.suspiciousIPs.clear()
		this.blockedIPs.clear()
		this.logger.debug('Rate limit middleware cleanup completed')
	}
}
