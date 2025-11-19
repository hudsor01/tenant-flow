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
import type { SecurityHeadersConfig } from '@repo/shared/types/security'
import { getCSPString } from '@repo/shared/security/csp-config'
import type { Request, Response } from 'express'
import { AppConfigService } from '../../config/app-config.service'

const SECURITY_CONFIG: SecurityHeadersConfig = {
	csp: {
		enabled: true,
		reportOnly: false,
		reportUri: '/api/v1/security/csp-report'
	},
	hsts: {
		enabled: true,
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
		payment: ['self'],
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

	constructor(private readonly config: AppConfigService) {}

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
			next()
		}
	}

	private setSecurityHeaders(req: Request, res: Response): void {
		const isSecure =
			req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https'
		const isDevelopment = this.config.isDevelopment()
		const isProduction = this.config.isProduction()
		const environment = isDevelopment ? 'development' : 'production'
		const reportOnly = isDevelopment

		const headers: Record<string, string> = {}

		if (SECURITY_CONFIG.csp.enabled) {
			const cspHeader = reportOnly
				? 'Content-Security-Policy-Report-Only'
				: 'Content-Security-Policy'
			const cspValue = this.buildCSPValue(
				environment,
				SECURITY_CONFIG.csp.reportUri,
				isProduction
			)
			headers[cspHeader] = cspValue
		}

		if (isProduction && isSecure) {
			let hstsValue = `max-age=${SECURITY_CONFIG.hsts.maxAge}`

			if (SECURITY_CONFIG.hsts.includeSubDomains) {
				hstsValue += '; includeSubDomains'
			}

			if (SECURITY_CONFIG.hsts.preload) {
				hstsValue += '; preload'
			}

			headers['Strict-Transport-Security'] = hstsValue
		}

		headers['X-Frame-Options'] = SECURITY_CONFIG.frameOptions
		if (SECURITY_CONFIG.contentTypeOptions) {
			headers['X-Content-Type-Options'] = 'nosniff'
		}
		if (SECURITY_CONFIG.xssProtection) {
			headers['X-XSS-Protection'] = '0'
		}
		headers['Referrer-Policy'] = SECURITY_CONFIG.referrerPolicy
		headers['Permissions-Policy'] = this.buildPermissionsPolicyValue(
			SECURITY_CONFIG.permissionsPolicy
		)

		Object.entries(headers).forEach(([key, value]) => {
			res.setHeader(key, value)
		})

		res.removeHeader('Server')
		res.removeHeader('X-Powered-By')

		if (isDevelopment) {
			this.logger.debug('Applied security headers', {
				operation: 'security_headers_applied',
				endpoint: req.url,
				method: req.method,
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				isSecure,
				hstsEnabled: isProduction && isSecure,
				cspEnabled: SECURITY_CONFIG.csp.enabled,
				headerCount: Object.keys(headers).length
			})
		}

		if (isProduction && SECURITY_CONFIG.hsts.maxAge && isSecure) {
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
		reportUri?: string,
		includeReportTo?: boolean
	): string {
		let cspValue = getCSPString(environment)

		if (reportUri) {
			cspValue += `; report-uri ${reportUri}`
		}

		if (includeReportTo) {
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

	public static customCSP(res: Response, customDirectives: string): void {
		res.setHeader('Content-Security-Policy', customDirectives)
	}

	public static setCORSHeaders(res: Response): void {
		res.setHeader(
			'Access-Control-Allow-Methods',
			'GET, POST, PUT, DELETE, OPTIONS, PATCH'
		)
		res.setHeader(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-CSRF-Token'
		)
		res.setHeader('Access-Control-Max-Age', '86400')
	}
}
