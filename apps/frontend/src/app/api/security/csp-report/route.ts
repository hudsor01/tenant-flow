import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { rateLimiter } from '@/lib/rate-limiter'
import type { CSPViolationReport, CSPReportBody } from '@repo/shared'
import { createLogger } from '@repo/shared'

const logger = createLogger({ component: 'CSPReportAPI' })

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
    logger.warn('CSP Violation Report received', {
      action: 'csp_violation_reported',
      metadata: {
        documentUri: report['document-uri'],
        violatedDirective: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
      }
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
    logger.error('CSP report processing failed', {
      action: 'csp_processing_error',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    })
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
    'javascript:void',
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
  report: CSPViolationReport,
  request: NextRequest
): Promise<void> {
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

  // Structured logging for production monitoring
  logger.warn('Security event recorded', {
    action: 'security_event_logged',
    metadata: securityEvent
  })

  // Send to external monitoring service if configured
  const monitoringWebhook = process.env.SECURITY_MONITORING_WEBHOOK
  if (monitoringWebhook) {
    try {
      await fetch(monitoringWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SECURITY_MONITORING_TOKEN}`
        },
        body: JSON.stringify(securityEvent)
      })
    } catch (error) {
      logger.error('Failed to send security event to monitoring service', {
        action: 'monitoring_webhook_failed',
        metadata: { error: error instanceof Error ? error.message : String(error) }
      })
    }
  }

  // Store in database for security audit trail
  try {
    await storeSecurityEvent(securityEvent)
  } catch (error) {
    logger.error('Failed to store security event in database', {
      action: 'security_event_storage_failed',
      metadata: { error: error instanceof Error ? error.message : String(error) }
    })
  }
}

/**
 * Store security event in database for audit trail
 */
// eslint-disable-next-line type-centralization/no-inline-types
interface SecurityEvent {
  type: string
  severity: string
  timestamp: string
  report: {
    violatedDirective: string
    blockedURI: string
    lineNumber: number
    sourceFile: string
    effectiveDirective: string
    documentURI: string
    referrer: string
    statusCode: number
  }
  client: {
    ip: string
    userAgent: string | null
    referer: string | null
    origin: string | null
  }
}

async function storeSecurityEvent(securityEvent: SecurityEvent): Promise<void> {
  // In a real implementation, store this in your database
  // Example with Supabase:

  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.warn('Supabase not configured for security event storage', {
      action: 'supabase_config_missing'
    })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  await supabase
    .from('security_events')
    .insert({
      event_type: securityEvent.type,
      severity: securityEvent.severity,
      data: securityEvent,
      client_ip: securityEvent.client.ip,
      user_agent: securityEvent.client.userAgent,
      created_at: securityEvent.timestamp
    })
}

/**
 * Extract request metadata for security analysis
 */
function getRequestMetadata(request: NextRequest) {
  return {
    timestamp: new Date().toISOString(),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous',
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer'),
    origin: request.headers.get('origin')
  }
}