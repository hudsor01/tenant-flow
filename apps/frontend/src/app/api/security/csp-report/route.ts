import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimiter } from '@/lib/rate-limiter'

interface CSPViolationReport {
  'document-uri': string
  referrer: string
  'violated-directive': string
  'effective-directive': string
  'original-policy': string
  disposition: string
  'blocked-uri': string
  'line-number': number
  'column-number': number
  'source-file': string
  'status-code': number
  'script-sample': string
}

interface CSPReportBody {
  'csp-report': CSPViolationReport
}

export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent CSP report spam
  const rateLimitResult = await rateLimiter(request, { 
    maxRequests: 50, 
    windowMs: 5 * 60 * 1000 // 50 reports per 5 minutes
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

    // Log CSP violation for monitoring
    console.warn('CSP Violation Report:', {
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    })

    // Filter out common false positives
    const isValidViolation = filterCSPViolation(report)
    
    if (isValidViolation) {
      // In production, you might want to send this to a monitoring service
      // like Sentry, DataDog, or custom logging service
      await logToSecurityMonitoring(report, request)
    }

    // Always return 204 to prevent attackers from knowing if reports are processed
    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('CSP report processing error:', error)
    return new NextResponse(null, { status: 204 })
  }
}

/**
 * Filter out common false positives in CSP violations
 */
function filterCSPViolation(report: CSPViolationReport): boolean {
  const blockedUri = report['blocked-uri']
  const sourceFile = report['source-file']
  
  // Common false positives to filter out
  const falsePositives = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'ms-browser-extension://',
    'data:application/font',
    'about:blank',
    'javascript:void(0)',
    // Browser injected scripts
    'translate.google.com',
    'translate.googleapis.com',
    // Ad blockers
    'adnxs.com',
    'doubleclick.net',
    // Analytics blockers
    'googletagmanager.com'
  ]

  // Check if blocked URI matches any false positive patterns
  for (const pattern of falsePositives) {
    if (blockedUri?.includes(pattern) || sourceFile?.includes(pattern)) {
      return false
    }
  }

  // Filter out violations from non-application domains
  const documentUri = report['document-uri']
  if (!documentUri?.includes('tenantflow.app')) {
    return false
  }

  return true
}

/**
 * Log security violations to monitoring service
 */
async function logToSecurityMonitoring(
  _report: CSPViolationReport, 
  _request: NextRequest
): Promise<void> {
  // In production, integrate with your monitoring service
  // Example integrations:
  
  // Sentry
  // Sentry.captureException(new Error('CSP Violation'), {
  //   tags: { type: 'csp_violation' },
  //   extra: report
  // })
  
  // DataDog
  // datadogLogs.logger.warn('CSP Violation', report)
  
  // Custom webhook
  // await fetch('https://your-monitoring-service.com/csp-violations', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ report, metadata: getRequestMetadata(request) })
  // })

  console.info('Security violation logged for monitoring')
}

/**
 * Extract request metadata for security analysis
 */
function _getRequestMetadata(request: NextRequest) {
  return {
    timestamp: new Date().toISOString(),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous',
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin')
  }
}