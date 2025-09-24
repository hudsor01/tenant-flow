/**
 * Express Configuration
 * Centralized middleware registration with full TypeScript support
 */

import type { NestExpressApplication } from '@nestjs/platform-express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import express, {
	type NextFunction,
	type Request,
	type Response
} from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

export async function registerExpressMiddleware(app: NestExpressApplication) {
	// Stripe webhook needs raw body for signature verification
	app.use(
		'/api/v1/stripe/webhook',
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

	// Compression middleware
	app.use(
		compression({
			threshold: 1024,
			level: 6,
			memLevel: 8
		})
	)

	// Cookie parsing
	app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET || (() => {
		throw new Error('COOKIE_SECRET or JWT_SECRET environment variable is required')
	})()))

	// Rate limiting with full TypeScript support
	app.use(
		rateLimit({
			windowMs: 60 * 1000, // 1 minute
			max: 100, // limit each IP to 100 requests per windowMs
			message: 'Too many requests from this IP, please try again later',
			standardHeaders: true,
			legacyHeaders: false,
			skip: req => {
				const path = req.url
				return path?.startsWith('/health') ?? false
			}
		})
	)

	// Body parsing limits - exclude Stripe webhook path to preserve raw buffer
	app.use((req: Request, res: Response, next: NextFunction) => {
		if (req.path === '/api/v1/stripe/webhook') {
			return next() // Skip JSON parsing for webhook
		}
		express.json({ limit: '10mb' })(req, res, next)
	})

	app.use((req: Request, res: Response, next: NextFunction) => {
		if (req.path === '/api/v1/stripe/webhook') {
			return next() // Skip URL encoding for webhook
		}
		express.urlencoded({ extended: true, limit: '10mb' })(req, res, next)
	})
}
