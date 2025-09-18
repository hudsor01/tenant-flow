/**
 * Fastify Configuration
 * Centralized plugin registration and configuration
 */

import circuitBreaker from '@fastify/circuit-breaker'
import compress from '@fastify/compress'
import cookie from '@fastify/cookie'
import csrfProtection from '@fastify/csrf-protection'
import env from '@fastify/env'
import etag from '@fastify/etag'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import requestContext from '@fastify/request-context'
import sensible from '@fastify/sensible'
import underPressure from '@fastify/under-pressure'
import type { NestFastifyApplication } from '@nestjs/platform-fastify'

export const FASTIFY_OPTIONS = {
	trustProxy: true,
	bodyLimit: 10485760, // 10MB
	logger: {
		level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
	}
}

export async function registerCorePlugins(app: NestFastifyApplication) {
	// Environment validation
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(env, {
		schema: {
			type: 'object',
			required: ['NODE_ENV'],
			properties: {
				NODE_ENV: {
					type: 'string',
					enum: ['development', 'production', 'test']
				},
				PORT: { type: 'string', default: '4600' },
				SUPABASE_URL: { type: 'string' },
				SERVICE_ROLE_KEY: { type: 'string' },
				JWT_SECRET: { type: 'string' }
			}
		},
		dotenv: false
	})

	// Request context
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(requestContext, {
		defaultStoreValues: {
			correlationId: () =>
				`req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			traceId: () =>
				`trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			startTime: () => Date.now()
		},
		hook: 'onRequest'
	})

	// Cookie support
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(cookie, {
		secret: process.env.COOKIE_SECRET ?? process.env.JWT_SECRET,
		hook: 'onRequest',
		parseOptions: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
			maxAge: 24 * 60 * 60 * 1000
		}
	})

	// CSRF protection
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(csrfProtection, {
		cookieOpts: {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
		},
		sessionPlugin: '@fastify/cookie',
		getToken: (req: {
			url?: string
			headers: Record<string, string | string[] | undefined>
		}) => {
			if (req.url === '/api/v1/stripe/webhook') return undefined
			const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token']
			return Array.isArray(token) ? token[0] : token
		},
		cookieKey: '_csrf'
	})

	// File uploads
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(multipart, {
		limits: {
			fileSize: 10485760,
			files: 5
		},
		attachFieldsToBody: 'keyValues'
	})

	// Compression
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(compress, {
		global: true,
		encodings: ['gzip', 'deflate', 'br'],
		threshold: 1024
	})

	// ETag
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(etag, {
		algorithm: 'fnv1a',
		weak: true
	})

	// Rate limiting
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(rateLimit, {
		global: true,
		max: 100,
		timeWindow: '1 minute',
		cache: 10000,
		allowList: (req: { url?: string }) => {
			const path = req.url
			return path?.startsWith('/health')
		}
	})

	// Sensible defaults
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(sensible)

	// Load monitoring
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(underPressure, {
		maxEventLoopDelay: 1000,
		maxHeapUsedBytes: 200000000,
		maxRssBytes: 300000000,
		retryAfter: 50
	})

	// Circuit breaker
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(circuitBreaker, {
		threshold: 5,
		timeout: 10000,
		resetTimeout: 30000
	})

	// Security headers
	// @ts-expect-error - Plugin type mismatch but runtime compatible
	await app.register(helmet, {
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'", "'unsafe-inline'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:', 'https:'],
				connectSrc: ["'self'"],
				fontSrc: ["'self'"],
				objectSrc: ["'none'"],
				mediaSrc: ["'self'"],
				frameSrc: ["'none'"]
			}
		},
		crossOriginEmbedderPolicy: false,
		hsts: {
			maxAge: 31536000,
			includeSubDomains: true,
			preload: true
		}
	})
}
