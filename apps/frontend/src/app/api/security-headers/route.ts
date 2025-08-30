import { NextResponse } from 'next/server'
import { getCSPString } from '@repo/shared'
// import type { NextRequest } from 'next/server'

/**
 * Security headers endpoint
 * This is a workaround for middleware Edge Runtime limitations
 * Call this endpoint from the client to set security headers
 */
export function GET() {
	const response = NextResponse.json({ success: true })

	// Security headers
	response.headers.set('X-Frame-Options', 'DENY')
	response.headers.set('X-Content-Type-Options', 'nosniff')
	response.headers.set('X-XSS-Protection', '1; mode=block')
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), interest-cohort=()'
	)

	// HSTS (only in production)
	if (process.env.NODE_ENV === 'production') {
		response.headers.set(
			'Strict-Transport-Security',
			'max-age=31536000; includeSubDomains; preload'
		)
	}

	// CSP using unified configuration (DRY principle)
	response.headers.set('Content-Security-Policy', getCSPString())

	return response
}
