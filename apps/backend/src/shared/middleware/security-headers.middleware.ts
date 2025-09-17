/**
 * Production-Grade Security Headers Middleware
 *
 * Apple-level security: Comprehensive security headers protection
 * - Content Security Policy (CSP) with strict directives
 * - HTTP Strict Transport Security (HSTS)
 * - X-Frame-Options for clickjacking protection
 * - X-Content-Type-Options to prevent MIME sniffing
 * - X-XSS-Protection for legacy browser protection
 * - Referrer-Policy for privacy protection
 * - Permissions-Policy for feature restrictions
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { getCSPString } from '@repo/shared'

interface SecurityHeadersConfig {
	csp: {
		enabled: boolean
		reportOnly: boolean
		reportUri?: string
	}
	hsts: {
		enabled: boolean
		maxAge: number
		includeSubDomains: boolean
		preload: boolean
	}
	frameOptions: 'DENY' | 'SAMEORIGIN'
	contentTypeOptions: boolean
	xssProtection: boolean
	referrerPolicy: string
	permissionsPolicy: Record<string, string[]>
}

const SECURITY_CONFIG: SecurityHeadersConfig = {
	csp: {
		enabled: true,
		reportOnly: process.env.NODE_ENV === 'development',
		reportUri: '/api/v1/security/csp-report'
	},
	hsts: {
		enabled: process.env.NODE_ENV === 'production',
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true
	},
	frameOptions: 'DENY',
	contentTypeOptions: true,
	xssProtection: true,
	referrerPolicy: 'strict-origin-when-cross-origin',
	permissionsPolicy: {
		camera: [],
		microphone: [],
		geolocation: [],
		payment: ['self'], // Allow payment APIs for Stripe
		usb: [],
		bluetooth: [],
		accelerometer: [],
		gyroscope: [],
		magnetometer: []
	}
}

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
	private readonly logger = new Logger(SecurityHeadersMiddleware.name)

	use(req: FastifyRequest, res: FastifyReply, next: () => void): void {
		this.setSecurityHeaders(req, res)
		next()
	}

	private setSecurityHeaders(req: FastifyRequest, res: FastifyReply): void {
		const isSecure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
		const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production'

		// Content Security Policy
		if (SECURITY_CONFIG.csp.enabled) {
			const cspHeader = SECURITY_CONFIG.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy'
			const cspValue = this.buildCSPValue(environment, SECURITY_CONFIG.csp.reportUri)

			res.header(cspHeader, cspValue)
		}

		// HTTP Strict Transport Security (HSTS) - only over HTTPS
		if (SECURITY_CONFIG.hsts.enabled && isSecure) {
			let hstsValue = `max-age=${SECURITY_CONFIG.hsts.maxAge}`

			if (SECURITY_CONFIG.hsts.includeSubDomains) {
				hstsValue += '; includeSubDomains'
			}

			if (SECURITY_CONFIG.hsts.preload) {
				hstsValue += '; preload'
			}

			res.header('Strict-Transport-Security', hstsValue)
		}

		// X-Frame-Options - Prevent clickjacking
		res.header('X-Frame-Options', SECURITY_CONFIG.frameOptions)

		// X-Content-Type-Options - Prevent MIME sniffing
		if (SECURITY_CONFIG.contentTypeOptions) {
			res.header('X-Content-Type-Options', 'nosniff')
		}

		// X-XSS-Protection - Legacy XSS protection
		if (SECURITY_CONFIG.xssProtection) {
			res.header('X-XSS-Protection', '1; mode=block')
		}

		// Referrer-Policy - Control referrer information
		res.header('Referrer-Policy', SECURITY_CONFIG.referrerPolicy)

		// Permissions-Policy - Control browser features
		const permissionsPolicy = this.buildPermissionsPolicyValue(SECURITY_CONFIG.permissionsPolicy)
		res.header('Permissions-Policy', permissionsPolicy)

		// X-DNS-Prefetch-Control - Control DNS prefetching
		res.header('X-DNS-Prefetch-Control', 'off')

		// X-Download-Options - Prevent automatic file execution
		res.header('X-Download-Options', 'noopen')

		// X-Permitted-Cross-Domain-Policies - Control cross-domain policies
		res.header('X-Permitted-Cross-Domain-Policies', 'none')

		// Cross-Origin-Embedder-Policy - Enable cross-origin isolation
		res.header('Cross-Origin-Embedder-Policy', 'require-corp')

		// Cross-Origin-Opener-Policy - Prevent cross-origin window access
		res.header('Cross-Origin-Opener-Policy', 'same-origin')

		// Cross-Origin-Resource-Policy - Control resource sharing
		res.header('Cross-Origin-Resource-Policy', 'same-origin')

		// Server header removal (don't expose server technology)
		res.removeHeader('Server')
		res.removeHeader('X-Powered-By')

		// Add security headers for API responses
		if (req.url.startsWith('/api/')) {
			res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
			res.header('Pragma', 'no-cache')
			res.header('Expires', '0')
		}

		// Log security headers application in development
		if (environment === 'development') {
			this.logger.debug('Applied security headers', {
				endpoint: req.url,
				method: req.method,
				isSecure,
				hstsEnabled: SECURITY_CONFIG.hsts.enabled && isSecure
			})
		}
	}

	private buildCSPValue(environment: 'development' | 'production', reportUri?: string): string {
		let cspValue = getCSPString(environment)

		// Add report-uri if specified
		if (reportUri) {
			cspValue += `; report-uri ${reportUri}`
		}

		// Add report-to for modern browsers (if implementing reporting API)
		if (process.env.NODE_ENV === 'production') {
			cspValue += '; report-to csp-endpoint'
		}

		return cspValue
	}

	private buildPermissionsPolicyValue(permissions: Record<string, string[]>): string {
		const policies: string[] = []

		for (const [feature, allowList] of Object.entries(permissions)) {
			if (allowList.length === 0) {
				policies.push(`${feature}=()`)
			} else {
				const origins = allowList.map(origin => origin === 'self' ? 'self' : `"${origin}"`).join(' ')
				policies.push(`${feature}=(${origins})`)
			}
		}

		return policies.join(', ')
	}

	// Method to update CSP for specific endpoints (e.g., webhook endpoints that need different policies)
	public static customCSP(res: FastifyReply, customDirectives: string): void {
		res.header('Content-Security-Policy', customDirectives)
	}

	// Method to set CORS headers for preflight requests
	public static setCORSHeaders(res: FastifyReply): void {
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token')
		res.header('Access-Control-Max-Age', '86400') // 24 hours
	}
}