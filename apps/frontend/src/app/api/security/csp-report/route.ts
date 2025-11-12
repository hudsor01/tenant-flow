import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	CSPReportBody,
	CSPViolationReport
} from '@repo/shared/types/domain'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { env } from '#config/env'

export const runtime = 'edge'

const logger = createLogger({ component: 'CSPReportAPI' })

// Simple in-file rate limiter to replace deleted shared rate-limiter abstraction
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function cleanupExpired(now: number) {
	for (const [key, rec] of rateLimitMap.entries()) {
		if (rec.resetTime <= now) rateLimitMap.delete(key)
	}
}

async function applyRateLimit(
	request: NextRequest,
	opts?: { windowMs?: number; maxRequests?: number }
) {
	const windowMs = opts?.windowMs ?? 5 * 60 * 1000
	const maxRequests = opts?.maxRequests ?? 50
	const forwarded = request.headers.get('x-forwarded-for')
	const realIp = request.headers.get('x-real-ip')
	const clientIP = forwarded?.split(',')[0]?.trim() || realIp || 'anonymous'
	const now = Date.now()
	const key = `${clientIP}:${request.nextUrl.pathname}`
	cleanupExpired(now)
	const rec = rateLimitMap.get(key)
	if (!rec || now > rec.resetTime) {
		rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
		return {
			success: true,
			limit: maxRequests,
			remaining: maxRequests - 1,
			reset: new Date(now + windowMs)
		}
	}
	if (rec.count >= maxRequests) {
		return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
	}
	rec.count += 1
	rateLimitMap.set(key, rec)
	return {
		success: true,
		limit: maxRequests,
		remaining: maxRequests - rec.count,
		reset: new Date(rec.resetTime)
	}
}

export async function POST(request: NextRequest) {
	// Apply rate limiting to prevent CSP report spam
	const rateLimitResult = await applyRateLimit(request, {
		maxRequests: 50,
		windowMs: 5 * 60 * 1000
	})
	if (rateLimitResult instanceof NextResponse) {
		return rateLimitResult
	}

	try {
		const body: CSPReportBody = await request.json()
		const report = body['csp-report']

		if (!report) {
			return NextResponse.json(
				{ error: 'Invalid CSP report format' },
				{ status: 400 }
			)
		}

		logger.warn('CSP Violation Report received', {
			action: 'csp_violation_reported',
			metadata: {
				documentUri: report['document-uri'],
				violatedDirective: report['violated-directive'],
				blockedUri: report['blocked-uri'],
				sourceFile: report['source-file'],
				lineNumber: report['line-number'],
				userAgent: request.headers.get('user-agent'),
				ip:
					request.headers.get('x-forwarded-for') ||
					request.headers.get('x-real-ip') ||
					'anonymous'
			}
		})

		const isValidViolation = filterCSPViolation(report)

		if (isValidViolation) {
			await logToSecurityMonitoring(report, request)
		}

		return new NextResponse(null, { status: 204 })
	} catch (error) {
		logger.error('CSP report processing failed', {
			action: 'csp_processing_error',
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
		return new NextResponse(null, { status: 204 })
	}
}

function filterCSPViolation(report: CSPViolationReport): boolean {
	const blockedUri = report['blocked-uri']
	const sourceFile = report['source-file']
	const falsePositives = [
		'chrome-extension://',
		'moz-extension://',
		'safari-extension://',
		'ms-browser-extension://',
		'data:application/font',
		'about:blank',
		'javascript' + ':' + 'void',
		'translate.google.com',
		'translate.googleapis.com',
		'adnxs.com',
		'doubleclick.net',
		'googletagmanager.com'
	]

	for (const pattern of falsePositives) {
		if (blockedUri?.includes(pattern) || sourceFile?.includes(pattern)) {
			return false
		}
	}

	const documentUri = report['document-uri']
	if (!documentUri?.includes('tenantflow.app')) {
		return false
	}

	return true
}

async function logToSecurityMonitoring(
	report: CSPViolationReport,
	request: NextRequest
) {
	const metadata = getRequestMetadata(request)
	const securityEvent = {
		type: 'csp_violation',
		severity: 'warning',
		timestamp: metadata.timestamp,
		report: {
			violatedDirective: report['violated-directive'],
			blockedURI: report['blocked-uri'],
			lineNumber: report['line-number'],
			sourceFile: report['source-file'],
			effectiveDirective: report['effective-directive'],
			documentURI: report['document-uri'],
			referrer: report.referrer,
			statusCode: report['status-code']
		},
		client: {
			ip: metadata.ip,
			userAgent: metadata.userAgent,
			referer: metadata.referer,
			origin: metadata.origin
		}
	}

	logger.warn('Security event recorded', {
		action: 'security_event_logged',
		metadata: securityEvent
	})

	const monitoringWebhook = env.SECURITY_MONITORING_WEBHOOK
	if (monitoringWebhook) {
		try {
			await fetch(monitoringWebhook, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.SECURITY_MONITORING_TOKEN}`
				},
				body: JSON.stringify(securityEvent)
			})
		} catch (error) {
			logger.error('Failed to send security event to monitoring service', {
				action: 'monitoring_webhook_failed',
				metadata: {
					error: error instanceof Error ? error.message : String(error)
				}
			})
		}
	}

	try {
		await storeSecurityEvent()
	} catch (error) {
		logger.error('Failed to store security event in database', {
			action: 'security_event_storage_failed',
			metadata: {
				error: error instanceof Error ? error.message : String(error)
			}
		})
	}
}

function getRequestMetadata(request: NextRequest) {
	const forwarded = request.headers.get('x-forwarded-for')
	const realIp = request.headers.get('x-real-ip')
	const ip = forwarded?.split(',')[0]?.trim() || realIp || 'anonymous'
	return {
		ip,
		userAgent: request.headers.get('user-agent') || '',
		referer: request.headers.get('referer') || '',
		origin: request.headers.get('origin') || '',
		timestamp: new Date().toISOString()
	}
}

async function storeSecurityEvent(): Promise<void> {
	// No-op in this simplified implementation; left as a hook for production
	return
}
