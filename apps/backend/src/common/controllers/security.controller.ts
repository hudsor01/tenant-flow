import { Controller, Post, Body, HttpCode, HttpStatus, Logger, Req } from '@nestjs/common'
import { Public } from '../../auth/decorators/public.decorator'
import { SecurityMonitorService } from '../security/security-monitor.service'
import { FastifyRequest } from 'fastify'

interface CSPViolationReport {
  'csp-report': {
    'document-uri': string
    'referrer': string
    'violated-directive': string
    'effective-directive': string
    'original-policy': string
    'disposition': string
    'blocked-uri': string
    'line-number': number
    'column-number': number
    'source-file': string
  }
}

interface SecurityAnalytics {
  violations: number
  topViolatedDirectives: { directive: string; count: number }[]
  topBlockedUris: { uri: string; count: number }[]
  recentViolations: {
    timestamp: Date
    directive: string
    blockedUri: string
    documentUri: string
  }[]
}

/**
 * Security Controller
 * 
 * Handles security-related endpoints including CSP violation reports,
 * security analytics, and security configuration endpoints.
 */
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name)
  private readonly violationStore = new Map<string, { count: number; lastSeen: Date }>()
  private readonly recentViolations: {
    timestamp: Date
    directive: string
    blockedUri: string
    documentUri: string
    ip: string
  }[] = []

  constructor(private readonly securityMonitor: SecurityMonitorService) {}

  /**
   * CSP Violation Report Endpoint
   * Receives and processes Content Security Policy violation reports
   */
  @Post('csp-report')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleCSPViolation(
    @Body() report: CSPViolationReport,
    @Req() req: FastifyRequest
  ): Promise<void> {
    try {
      const violation = report['csp-report']
      
      if (!violation) {
        this.logger.warn('Invalid CSP report received', { body: report })
        return
      }

      const violationKey = `${violation['violated-directive']}:${violation['blocked-uri']}`
      const existing = this.violationStore.get(violationKey)
      
      // Update violation count
      this.violationStore.set(violationKey, {
        count: (existing?.count || 0) + 1,
        lastSeen: new Date()
      })

      // Store recent violation for analytics
      this.recentViolations.push({
        timestamp: new Date(),
        directive: violation['violated-directive'],
        blockedUri: violation['blocked-uri'],
        documentUri: violation['document-uri'],
        ip: req.ip || 'unknown'
      })

      // Keep only last 1000 violations
      if (this.recentViolations.length > 1000) {
        this.recentViolations.splice(0, this.recentViolations.length - 1000)
      }

      // Determine severity based on violation type
      const severity = this.assessViolationSeverity(violation)
      
      // Log security event
      await this.securityMonitor.logSecurityEvent({
        type: 'CSRF_VIOLATION', // Using closest available type
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: violation['document-uri'],
        severity,
        details: {
          violatedDirective: violation['violated-directive'],
          effectiveDirective: violation['effective-directive'],
          blockedUri: violation['blocked-uri'],
          sourceFile: violation['source-file'],
          lineNumber: violation['line-number'],
          columnNumber: violation['column-number'],
          disposition: violation['disposition'],
          originalPolicy: violation['original-policy'].substring(0, 200) // Truncate for storage
        }
      })

      // Log violation details
      this.logger.warn('CSP violation reported', {
        directive: violation['violated-directive'],
        blockedUri: violation['blocked-uri'],
        documentUri: violation['document-uri'],
        sourceFile: violation['source-file'],
        ip: req.ip,
        severity,
        count: this.violationStore.get(violationKey)?.count
      })

      // Alert on critical violations
      if (severity === 'critical') {
        this.logger.error('Critical CSP violation detected', {
          directive: violation['violated-directive'],
          blockedUri: violation['blocked-uri'],
          ip: req.ip,
          userAgent: req.headers['user-agent']
        })
      }

    } catch (error) {
      this.logger.error('Error processing CSP violation report', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: report,
        ip: req.ip
      })
    }
  }

  /**
   * Get security analytics and violation statistics
   */
  @Post('analytics')
  @Public() // Make public for development, add auth for production
  async getSecurityAnalytics(): Promise<SecurityAnalytics> {
    try {
      // Calculate top violated directives
      const directiveStats = new Map<string, number>()
      const uriStats = new Map<string, number>()

      this.recentViolations.forEach(violation => {
        const directive = violation.directive
        const uri = violation.blockedUri
        
        directiveStats.set(directive, (directiveStats.get(directive) || 0) + 1)
        uriStats.set(uri, (uriStats.get(uri) || 0) + 1)
      })

      const topViolatedDirectives = Array.from(directiveStats.entries())
        .map(([directive, count]) => ({ directive, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const topBlockedUris = Array.from(uriStats.entries())
        .map(([uri, count]) => ({ uri, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Get recent violations (last 100)
      const recentViolations = this.recentViolations
        .slice(-100)
        .map(({ ip: _ip, ...violation }) => violation) // Remove IP from response

      return {
        violations: this.recentViolations.length,
        topViolatedDirectives,
        topBlockedUris,
        recentViolations
      }

    } catch (error) {
      this.logger.error('Error generating security analytics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      return {
        violations: 0,
        topViolatedDirectives: [],
        topBlockedUris: [],
        recentViolations: []
      }
    }
  }

  /**
   * Health check for security subsystem
   */
  @Post('health')
  @Public()
  async getSecurityHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error'
    checks: {
      name: string
      status: 'pass' | 'warn' | 'fail'
      message: string
    }[]
  }> {
    const checks: {
      name: string
      status: 'pass' | 'warn' | 'fail'
      message: string
    }[] = []

    // Check CSP violation rate
    const recentViolations = this.recentViolations.filter(
      v => Date.now() - v.timestamp.getTime() < 60000 // Last minute
    ).length

    checks.push({
      name: 'CSP Violations',
      status: recentViolations > 10 ? 'warn' : 'pass',
      message: `${recentViolations} violations in last minute`
    })

    // Check for critical violations
    const criticalViolations = this.recentViolations.filter(
      v => Date.now() - v.timestamp.getTime() < 300000 && // Last 5 minutes
           (v.directive.includes('script-src') || v.directive.includes('object-src'))
    ).length

    checks.push({
      name: 'Critical Security Violations',
      status: criticalViolations > 0 ? 'fail' : 'pass',
      message: `${criticalViolations} critical violations in last 5 minutes`
    })

    // Overall status
    const hasFailures = checks.some(c => c.status === 'fail')
    const hasWarnings = checks.some(c => c.status === 'warn')
    
    const status = hasFailures ? 'error' : hasWarnings ? 'warning' : 'healthy'

    return { status, checks }
  }

  private assessViolationSeverity(violation: CSPViolationReport['csp-report']): 'low' | 'medium' | 'high' | 'critical' {
    const directive = violation['violated-directive']
    const blockedUri = violation['blocked-uri']

    // Critical: Script injection attempts
    if (directive.includes('script-src') && (
      blockedUri.includes('javascript:') ||
      blockedUri.includes('data:') ||
      blockedUri.includes('eval')
    )) {
      return 'critical'
    }

    // High: Object/plugin execution
    if (directive.includes('object-src')) {
      return 'high'
    }

    // High: External script loading
    if (directive.includes('script-src') && blockedUri.startsWith('http')) {
      return 'high'
    }

    // Medium: Style violations
    if (directive.includes('style-src')) {
      return 'medium'
    }

    // Medium: Frame embedding attempts
    if (directive.includes('frame-src') || directive.includes('frame-ancestors')) {
      return 'medium'
    }

    // Low: Resource loading violations
    return 'low'
  }

  /**
   * Clear violation history (for testing/development)
   */
  @Post('clear-violations')
  @Public() // Remove in production or add proper auth
  async clearViolations(): Promise<{ cleared: number }> {
    const count = this.recentViolations.length
    this.recentViolations.length = 0
    this.violationStore.clear()
    
    this.logger.log(`Cleared ${count} CSP violations from memory`)
    return { cleared: count }
  }
}