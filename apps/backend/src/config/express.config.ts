/**
 * Express Configuration
 * Centralized middleware registration with full TypeScript support
 *
 * NOTE: Rate limiting is handled by @nestjs/throttler (see app.module.ts)
 * Removed redundant express-rate-limit in favor of native NestJS solution
 */

import type { NestExpressApplication } from '@nestjs/platform-express'
import { AppConfigService } from './app-config.service'
import { performanceConfig } from './performance.config'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, {
	type NextFunction,
	type Request,
	type Response
} from 'express'
import helmet from 'helmet'

type RawBodyRequest = Request & { rawBody?: Buffer }

const STRIPE_WEBHOOK_BASE_PATHS = [
	'/stripe/webhook',
	'/webhooks/stripe-sync',
	'/webhooks/stripe'
]

const RESEND_WEBHOOK_BASE_PATHS = ['/webhooks/resend']

const ensureLeadingSlash = (path: string): string =>
	path.startsWith('/') ? path : `/${path}`

const normalizeRoutePath = (path: string): string => {
	if (!path) return '/'
	const trimmed = ensureLeadingSlash(path.trim())
	if (trimmed.length > 1 && trimmed.endsWith('/')) {
		return trimmed.replace(/\/+$/, '')
	}
	return trimmed
}

const normalizePrefix = (prefix?: string): string => {
	if (!prefix) return ''
	const trimmed = prefix.replace(/^\/|\/$/g, '')
	return trimmed.length ? `/${trimmed}` : ''
}

const buildWebhookPaths = (
	basePaths: string[],
	globalPrefix?: string
): string[] => {
	const prefix = normalizePrefix(globalPrefix)
	const uniquePaths = new Set<string>()

	for (const basePath of basePaths) {
		const normalizedBase = normalizeRoutePath(basePath)
		uniquePaths.add(normalizedBase)
		if (prefix) {
			uniquePaths.add(normalizeRoutePath(`${prefix}${normalizedBase}`))
		}
	}

	return Array.from(uniquePaths)
}

const sanitizeRequestPath = (req: Request): string => {
	const rawPath = req.originalUrl || req.url || req.path || '/'
	const pathOnly = rawPath.split('?')[0] || '/'
	return normalizeRoutePath(pathOnly)
}

const isWebhookRequest = (
	req: Request,
	webhookPaths: string[]
): boolean => {
	const requestPath = sanitizeRequestPath(req)
	return webhookPaths.some(
		registeredPath =>
			requestPath === registeredPath ||
			requestPath.startsWith(`${registeredPath}/`)
	)
}

export interface ExpressMiddlewareOptions {
	globalPrefix?: string
}

export async function registerExpressMiddleware(
	app: NestExpressApplication,
	appConfigService: AppConfigService,
	options: ExpressMiddlewareOptions = {}
) {
	const stripeWebhookPaths = buildWebhookPaths(
		STRIPE_WEBHOOK_BASE_PATHS,
		options.globalPrefix
	)
	const resendWebhookPaths = buildWebhookPaths(
		RESEND_WEBHOOK_BASE_PATHS,
		options.globalPrefix
	)

	// Stripe webhooks need raw body for signature verification. Register middleware for both
	// prefixed (e.g., /api/v1/...) and unprefixed routes to support local testing.
	for (const path of stripeWebhookPaths) {
		app.use(
			path,
			express.raw({ type: '*/*', limit: '1mb' }),
			(req: RawBodyRequest, _res: Response, next: NextFunction) => {
				if (!req.rawBody && Buffer.isBuffer(req.body)) {
					req.rawBody = req.body
				}
				next()
			}
		)
	}

	// Security headers with full TypeScript support
	app.use(
		helmet({
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
	)

	// Response compression (gzip) - uses settings from performance.config.ts
	app.use(compression(performanceConfig.optimization.compression))

	// Cookie parsing
	app.use(cookieParser(appConfigService.getJwtSecret()))

	// Body parsing limits - exclude Stripe webhook paths to preserve raw buffer
	// FIX: Create middleware instances ONCE, not on every request
	const jsonParser = express.json({
		limit: '10mb',
		verify: (req: RawBodyRequest, _res, buf) => {
			if (!req.rawBody && isWebhookRequest(req, resendWebhookPaths)) {
				req.rawBody = Buffer.from(buf)
			}
		}
	})
	const urlencodedParser = express.urlencoded({ extended: true, limit: '10mb' })

	app.use((req: Request, res: Response, next: NextFunction) => {
		if (isWebhookRequest(req, stripeWebhookPaths)) {
			return next() // Skip JSON parsing for webhooks
		}
		jsonParser(req, res, next)
	})

	app.use((req: Request, res: Response, next: NextFunction) => {
		if (isWebhookRequest(req, stripeWebhookPaths)) {
			return next() // Skip URL encoding for webhooks
		}
		urlencodedParser(req, res, next)
	})
}
