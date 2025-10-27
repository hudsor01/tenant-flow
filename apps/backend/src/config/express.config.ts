/**
 * Express Configuration
 * Centralized middleware registration with full TypeScript support
 *
 * NOTE: Compression is handled in main.ts (NestJS official pattern)
 * NOTE: Rate limiting is handled by @nestjs/throttler (see app.module.ts)
 * Removed redundant express-rate-limit in favor of native NestJS solution
 */

import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import express, {
	type NextFunction,
	type Request,
	type Response
} from 'express'
import helmet from 'helmet'

export async function registerExpressMiddleware(app: NestExpressApplication) {
	// Stripe webhooks need raw body for signature verification
	app.use(
		'/api/v1/stripe/webhook',
		express.raw({ type: 'application/json', limit: '1mb' })
	)
	app.use(
		'/api/v1/webhooks/stripe-sync',
		express.raw({ type: 'application/json', limit: '1mb' })
	)

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

	// Cookie parsing
	app.use(
		cookieParser(
			process.env.JWT_SECRET ||
				(() => {
					throw new Error('JWT_SECRET environment variable is required')
				})()
		)
	)

	// Body parsing limits - exclude Stripe webhook paths to preserve raw buffer
	app.use((req: Request, res: Response, next: NextFunction) => {
		if (
			req.path === '/api/v1/stripe/webhook' ||
			req.path === '/api/v1/webhooks/stripe-sync'
		) {
			return next() // Skip JSON parsing for webhooks
		}
		express.json({ limit: '10mb' })(req, res, next)
	})

	app.use((req: Request, res: Response, next: NextFunction) => {
		if (
			req.path === '/api/v1/stripe/webhook' ||
			req.path === '/api/v1/webhooks/stripe-sync'
		) {
			return next() // Skip URL encoding for webhooks
		}
		express.urlencoded({ extended: true, limit: '10mb' })(req, res, next)
	})
}
