/**
 * Production-Grade Input Validation & Sanitization Middleware
 *
 * Apple-level security: Comprehensive input validation and threat detection
 * - SQL injection prevention with pattern detection
 * - XSS protection with HTML sanitization
 * - Path traversal prevention
 * - NoSQL injection protection
 * - Request size and complexity limits
 * - Malicious payload detection and blocking
 */

import { Injectable, NestMiddleware, Logger, BadRequestException } from '@nestjs/common'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { PinoLogger } from 'nestjs-pino'
import { SecurityMonitorService } from '../services/security-monitor.service'

interface SanitizationConfig {
	enabled: boolean
	maxDepth: number
	maxStringLength: number
	maxArrayLength: number
	maxObjectKeys: number
	allowHTML: boolean
	strictMode: boolean
}

interface ThreatPattern {
	name: string
	pattern: RegExp
	severity: 'low' | 'medium' | 'high'
	block: boolean
}

const SANITIZATION_CONFIG: Record<string, SanitizationConfig> = {
	DEFAULT: {
		enabled: true,
		maxDepth: 10,
		maxStringLength: 10000,
		maxArrayLength: 1000,
		maxObjectKeys: 100,
		allowHTML: false,
		strictMode: true
	},
	WEBHOOK: {
		enabled: false, // Webhooks need raw body
		maxDepth: 0,
		maxStringLength: 0,
		maxArrayLength: 0,
		maxObjectKeys: 0,
		allowHTML: false,
		strictMode: false
	},
	FILE_UPLOAD: {
		enabled: true,
		maxDepth: 5,
		maxStringLength: 255,
		maxArrayLength: 10,
		maxObjectKeys: 20,
		allowHTML: false,
		strictMode: true
	}
}

// Enhanced threat detection patterns
const THREAT_PATTERNS: ThreatPattern[] = [
	// SQL Injection patterns
	{
		name: 'sql_injection_union',
		pattern: /(\bunion\b.*\bselect\b|\bselect\b.*\bunion\b)/gi,
		severity: 'high',
		block: true
	},
	{
		name: 'sql_injection_quotes',
		pattern: /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/gi,
		severity: 'medium',
		block: false
	},
	{
		name: 'sql_injection_boolean',
		pattern: /(\bor\b|\band\b).*(\b1=1\b|\b1\s*=\s*1\b|\btrue\b)/gi,
		severity: 'high',
		block: true
	},
	{
		name: 'sql_injection_functions',
		pattern: /(exec\s*\(|execute\s*\(|sp_executesql|xp_cmdshell)/gi,
		severity: 'high',
		block: true
	},

	// XSS patterns
	{
		name: 'xss_script_tag',
		pattern: /<script[^>]*>.*?<\/script>/gi,
		severity: 'high',
		block: true
	},
	{
		name: 'xss_javascript_url',
		pattern: /javascript\s*:/gi,
		severity: 'high',
		block: true
	},
	{
		name: 'xss_event_handlers',
		pattern: /on\w+\s*=\s*["'][^"']*["']/gi,
		severity: 'medium',
		block: true
	},
	{
		name: 'xss_iframe',
		pattern: /<iframe[^>]*>.*?<\/iframe>/gi,
		severity: 'medium',
		block: true
	},

	// Path traversal patterns
	{
		name: 'path_traversal_dotdot',
		pattern: /\.\.\//g,
		severity: 'high',
		block: true
	},
	{
		name: 'path_traversal_encoded',
		pattern: /(\.\.\%2f|\.\.\%5c|%2e%2e%2f)/gi,
		severity: 'high',
		block: true
	},

	// Command injection patterns
	{
		name: 'command_injection_pipes',
		pattern: /[;&|`$]/g,
		severity: 'medium',
		block: false
	},
	{
		name: 'command_injection_shell',
		pattern: /(bash|sh|cmd|powershell)\s/gi,
		severity: 'high',
		block: true
	},

	// NoSQL injection patterns
	{
		name: 'nosql_injection_mongo',
		pattern: /(\$where|\$ne|\$gt|\$lt|\$regex)/gi,
		severity: 'medium',
		block: false
	},

	// Server-side template injection
	{
		name: 'template_injection',
		pattern: /(\{\{.*\}\}|\${.*})/gi,
		severity: 'medium',
		block: false
	},

	// XML External Entity (XXE) patterns
	{
		name: 'xxe_entity',
		pattern: /<!entity[^>]*>/gi,
		severity: 'high',
		block: true
	},

	// LDAP injection patterns
	{
		name: 'ldap_injection',
		pattern: /[()&|!*]/g,
		severity: 'medium',
		block: false
	}
]

@Injectable()
export class InputSanitizationMiddleware implements NestMiddleware {
	private readonly logger = new Logger(InputSanitizationMiddleware.name)
	private readonly securityLogger: PinoLogger
	private readonly securityMonitor: SecurityMonitorService

	constructor(
		logger: PinoLogger,
		securityMonitor: SecurityMonitorService
	) {
		this.securityLogger = logger
		this.securityLogger.setContext(InputSanitizationMiddleware.name)
		this.securityMonitor = securityMonitor
	}

	use(req: FastifyRequest, res: FastifyReply, next: () => void): void {
		const config = this.getConfigForEndpoint(req.url)

		if (!config.enabled) {
			next()
			return
		}

		try {
			// Validate and sanitize request
			this.validateRequest(req, config)
			this.sanitizeRequest(req, config)
			next()
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error
			}

			this.logger.error('Input sanitization failed', error)
			throw new BadRequestException('Invalid request format')
		}
	}

	private getConfigForEndpoint(url: string): SanitizationConfig {
		if (url.includes('/webhook')) {
			return SANITIZATION_CONFIG.WEBHOOK
		}

		if (url.includes('/upload') || url.includes('/file')) {
			return SANITIZATION_CONFIG.FILE_UPLOAD
		}

		return SANITIZATION_CONFIG.DEFAULT
	}

	private validateRequest(req: FastifyRequest, config: SanitizationConfig): void {
		// Validate request size
		const bodySize = this.getRequestSize(req)
		if (bodySize > 10 * 1024 * 1024) { // 10MB limit
			this.securityMonitor.logSecurityEvent({
				type: 'malicious_request',
				severity: 'medium',
				source: 'input_sanitization',
				description: `Request body too large: ${bodySize} bytes`,
				metadata: { bodySize, endpoint: req.url },
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] as string
			})

			throw new BadRequestException('Request body too large')
		}

		// Validate URL length
		if (req.url.length > 2048) {
			this.securityMonitor.logSecurityEvent({
				type: 'malicious_request',
				severity: 'medium',
				source: 'input_sanitization',
				description: `URL too long: ${req.url.length} characters`,
				metadata: { urlLength: req.url.length },
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] as string
			})

			throw new BadRequestException('URL too long')
		}

		// Validate query parameters
		if (req.query) {
			this.validateObject(req.query as Record<string, unknown>, config, 'query', req)
		}

		// Validate request body
		if (req.body && typeof req.body === 'object') {
			this.validateObject(req.body as Record<string, unknown>, config, 'body', req)
		}
	}

	private validateObject(
		obj: Record<string, unknown>,
		config: SanitizationConfig,
		source: string,
		req: FastifyRequest,
		depth: number = 0
	): void {
		if (depth > config.maxDepth) {
			throw new BadRequestException(`${source} nesting too deep`)
		}

		const keys = Object.keys(obj)
		if (keys.length > config.maxObjectKeys) {
			throw new BadRequestException(`Too many keys in ${source}`)
		}

		for (const [key, value] of Object.entries(obj)) {
			// Validate key
			this.validateString(key, config, `${source} key`, req, false)

			// Validate value based on type
			if (typeof value === 'string') {
				this.validateString(value, config, `${source} value`, req, config.allowHTML)
			} else if (Array.isArray(value)) {
				this.validateArray(value, config, `${source} array`, req, depth + 1)
			} else if (value && typeof value === 'object') {
				this.validateObject(value as Record<string, unknown>, config, source, req, depth + 1)
			}
		}
	}

	private validateArray(
		arr: unknown[],
		config: SanitizationConfig,
		source: string,
		req: FastifyRequest,
		depth: number
	): void {
		if (arr.length > config.maxArrayLength) {
			throw new BadRequestException(`${source} too long`)
		}

		for (let i = 0; i < arr.length; i++) {
			const item = arr[i]

			if (typeof item === 'string') {
				this.validateString(item, config, `${source}[${i}]`, req, config.allowHTML)
			} else if (Array.isArray(item)) {
				this.validateArray(item, config, `${source}[${i}]`, req, depth + 1)
			} else if (item && typeof item === 'object') {
				this.validateObject(item as Record<string, unknown>, config, `${source}[${i}]`, req, depth + 1)
			}
		}
	}

	private validateString(
		str: string,
		config: SanitizationConfig,
		source: string,
		req: FastifyRequest,
		allowHTML: boolean
	): void {
		if (str.length > config.maxStringLength) {
			throw new BadRequestException(`${source} too long`)
		}

		// Detect threats
		this.detectThreats(str, source, req)

		// Validate encoding
		if (!this.isValidUTF8(str)) {
			this.securityMonitor.logSecurityEvent({
				type: 'malicious_request',
				severity: 'medium',
				source: 'input_sanitization',
				description: `Invalid UTF-8 encoding in ${source}`,
				metadata: { source, stringLength: str.length },
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] as string
			})

			throw new BadRequestException(`Invalid encoding in ${source}`)
		}

		// Check for HTML if not allowed
		if (!allowHTML && this.containsHTML(str)) {
			this.securityMonitor.logSecurityEvent({
				type: 'xss_attempt',
				severity: 'medium',
				source: 'input_sanitization',
				description: `HTML detected in ${source}`,
				metadata: { source, hasHTML: true, sample: str.substring(0, 100) },
				ipAddress: req.ip,
				userAgent: req.headers['user-agent'] as string
			})

			throw new BadRequestException(`HTML not allowed in ${source}`)
		}
	}

	private detectThreats(str: string, source: string, req: FastifyRequest): void {
		for (const threat of THREAT_PATTERNS) {
			if (threat.pattern.test(str)) {
				this.securityMonitor.logSecurityEvent({
					type: this.mapThreatToEventType(threat.name),
					severity: threat.severity,
					source: 'input_sanitization',
					description: `${threat.name} detected in ${source}`,
					metadata: {
						threatName: threat.name,
						source,
						sample: str.substring(0, 100),
						fullMatch: str.match(threat.pattern)?.[0]
					},
					ipAddress: req.ip,
					userAgent: req.headers['user-agent'] as string
				})

				if (threat.block) {
					throw new BadRequestException('Malicious input detected')
				}
			}
		}
	}

	private mapThreatToEventType(threatName: string): 'sql_injection_attempt' | 'xss_attempt' | 'malicious_request' {
		if (threatName.includes('sql')) return 'sql_injection_attempt'
		if (threatName.includes('xss')) return 'xss_attempt'
		return 'malicious_request'
	}

	private sanitizeRequest(req: FastifyRequest, config: SanitizationConfig): void {
		if (req.query) {
			req.query = this.sanitizeObject(req.query as Record<string, unknown>, config) as any
		}

		if (req.body && typeof req.body === 'object') {
			req.body = this.sanitizeObject(req.body as Record<string, unknown>, config)
		}
	}

	private sanitizeObject(obj: Record<string, unknown>, config: SanitizationConfig): Record<string, unknown> {
		const sanitized: Record<string, unknown> = {}

		for (const [key, value] of Object.entries(obj)) {
			const sanitizedKey = this.sanitizeString(key, config)

			if (typeof value === 'string') {
				sanitized[sanitizedKey] = this.sanitizeString(value, config)
			} else if (Array.isArray(value)) {
				sanitized[sanitizedKey] = this.sanitizeArray(value, config)
			} else if (value && typeof value === 'object') {
				sanitized[sanitizedKey] = this.sanitizeObject(value as Record<string, unknown>, config)
			} else {
				sanitized[sanitizedKey] = value
			}
		}

		return sanitized
	}

	private sanitizeArray(arr: unknown[], config: SanitizationConfig): unknown[] {
		return arr.map(item => {
			if (typeof item === 'string') {
				return this.sanitizeString(item, config)
			} else if (Array.isArray(item)) {
				return this.sanitizeArray(item, config)
			} else if (item && typeof item === 'object') {
				return this.sanitizeObject(item as Record<string, unknown>, config)
			}
			return item
		})
	}

	private sanitizeString(str: string, config: SanitizationConfig): string {
		let sanitized = str

		// Remove null bytes
		sanitized = sanitized.replace(/\0/g, '')

		// Normalize unicode
		sanitized = sanitized.normalize('NFC')

		// Trim whitespace
		sanitized = sanitized.trim()

		// Remove control characters except tab, newline, and carriage return
		sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

		// If strict mode, apply additional sanitization
		if (config.strictMode) {
			// Remove potentially dangerous characters
			sanitized = sanitized.replace(/[<>'"&]/g, (match) => {
				const entityMap: Record<string, string> = {
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#x27;',
					'&': '&amp;'
				}
				return entityMap[match] || match
			})
		}

		return sanitized
	}

	private getRequestSize(req: FastifyRequest): number {
		const contentLength = req.headers['content-length']
		return contentLength ? parseInt(contentLength, 10) : 0
	}

	private isValidUTF8(str: string): boolean {
		try {
			// Try to encode and decode the string to check for valid UTF-8
			const encoded = encodeURIComponent(str)
			decodeURIComponent(encoded)
			return true
		} catch {
			return false
		}
	}

	private containsHTML(str: string): boolean {
		return /<[^>]+>/g.test(str)
	}
}