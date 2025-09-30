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

import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import type { SecurityHeadersConfig } from '@repo/shared/types/backend-domain'
import { getCSPString } from '@repo/shared/security/csp-config'
import type { Request, Response } from 'express'

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

	use(req: Request, res: Response, next: () => void): void {
		try {
			this.setSecurityHeaders(req, res)
			next()
		} catch (error) {
			this.logger.error('Security headers middleware failed', {
				operation: 'security_headers_failure',
				endpoint: req.url,
				method: req.method,
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				errorType: error instanceof Error ? error.constructor.name : 'Unknown',
				errorMessage: error instanceof Error ? error.message : String(error)
			})
			// Continue without security headers rather than blocking request
			next()
		}
	}

	private setSecurityHeaders(req: Request, res: Response): void {
		const isSecure =
			req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
		const environment =
			process.env.NODE_ENV === 'development' ? 'development' : 'production'

		// Build headers object for batch setting
		const headers: Record<string, string> = {}

		// Content Security Policy
		if (SECURITY_CONFIG.csp.enabled) {
			const cspHeader = SECURITY_CONFIG.csp.reportOnly
				? 'Content-Security-Policy-Report-Only'
				: 'Content-Security-Policy'
			const cspValue = this.buildCSPValue(
				environment,
				SECURITY_CONFIG.csp.reportUri
			)
			headers[cspHeader] = cspValue
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

			headers['Strict-Transport-Security'] = hstsValue
		}

		// X-Frame-Options - Prevent clickjacking
		headers['X-Frame-Options'] = SECURITY_CONFIG.frameOptions

		// X-Content-Type-Options - Prevent MIME sniffing
		if (SECURITY_CONFIG.contentTypeOptions) {
			headers['X-Content-Type-Options'] = 'nosniff'
		}

		// X-XSS-Protection - Legacy XSS protection
		if (SECURITY_CONFIG.xssProtection) {
			headers['X-XSS-Protection'] = '1; mode=block'
		}

		// Referrer-Policy - Control referrer information
		headers['Referrer-Policy'] = SECURITY_CONFIG.referrerPolicy

		// Permissions-Policy - Control browser features
		const permissionsPolicy = this.buildPermissionsPolicyValue(
			SECURITY_CONFIG.permissionsPolicy
		)
		headers['Permissions-Policy'] = permissionsPolicy

		// X-DNS-Prefetch-Control - Control DNS prefetching
		headers['X-DNS-Prefetch-Control'] = 'off'

		// X-Download-Options - Prevent automatic file execution
		headers['X-Download-Options'] = 'noopen'

		// X-Permitted-Cross-Domain-Policies - Control cross-domain policies
		headers['X-Permitted-Cross-Domain-Policies'] = 'none'

		// Cross-Origin-Embedder-Policy - Enable cross-origin isolation
		headers['Cross-Origin-Embedder-Policy'] = 'require-corp'

		// Cross-Origin-Opener-Policy - Prevent cross-origin window access
		headers['Cross-Origin-Opener-Policy'] = 'same-origin'

		// Cross-Origin-Resource-Policy - Control resource sharing
		headers['Cross-Origin-Resource-Policy'] = 'same-origin'

		// Add security headers for API responses
		if (req.url.startsWith('/api/')) {
			headers['Cache-Control'] =
				'no-store, no-cache, must-revalidate, proxy-revalidate'
			headers['Pragma'] = 'no-cache'
			headers['Expires'] = '0'
		}

		// Set all headers using Express response methods
		Object.entries(headers).forEach(([key, value]) => {
			res.setHeader(key, value)
		})

		// Server header removal (don't expose server technology)
		res.removeHeader('Server')
		res.removeHeader('X-Powered-By')

		// Log security headers application in development
		if (environment === 'development') {
			this.logger.debug('Applied security headers', {
				operation: 'security_headers_applied',
				endpoint: req.url,
				method: req.method,
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				isSecure,
				hstsEnabled: SECURITY_CONFIG.hsts.enabled && isSecure,
				cspEnabled: SECURITY_CONFIG.csp.enabled,
				headerCount: Object.keys(headers).length
			})
		}

		// Log HSTS application in production for monitoring
		if (environment === 'production' && SECURITY_CONFIG.hsts.enabled && isSecure) {
			this.logger.debug('HSTS header applied', {
				operation: 'security_headers_hsts_applied',
				endpoint: req.url,
				maxAge: SECURITY_CONFIG.hsts.maxAge,
				includeSubDomains: SECURITY_CONFIG.hsts.includeSubDomains,
				preload: SECURITY_CONFIG.hsts.preload
			})
		}
	}

	private buildCSPValue(
		environment: 'development' | 'production',
		reportUri?: string
	): string {
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

	private buildPermissionsPolicyValue(
		permissions: Record<string, string[]>
	): string {
		const policies: string[] = []

		for (const [feature, allowList] of Object.entries(permissions)) {
			if (allowList.length === 0) {
				policies.push(`${feature}=()`)
			} else {
				const origins = allowList
					.map(origin => (origin === 'self' ? 'self' : `"${origin}"`))
					.join(' ')
				policies.push(`${feature}=(${origins})`)
			}
		}

		return policies.join(', ')
	}

	// Method to update CSP for specific endpoints (e.g., webhook endpoints that need different policies)
	public static customCSP(res: Response, customDirectives: string): void {
		res.setHeader('Content-Security-Policy', customDirectives)
		// Note: Would log here but this is a static method - consider refactoring if logging needed
	}

	// Method to set CORS headers for preflight requests
	public static setCORSHeaders(res: Response): void {
		res.setHeader(
			'Access-Control-Allow-Methods',
			'GET, POST, PUT, DELETE, OPTIONS, PATCH'
		)
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token'
		)
		res.setHeader('Access-Control-Max-Age', '86400') // 24 hours
	}
}
