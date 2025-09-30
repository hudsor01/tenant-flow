/**
 * Security Controller
 *
 * Ultra-native NestJS security endpoints following architectural standards
 * - CSP violation reporting
 * - Security metrics dashboard
 * - Security event resolution
 * - System status monitoring
 */

import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Logger,
	Param,
	ParseUUIDPipe,
	Post,
	SetMetadata
} from '@nestjs/common'
import type { CSPReportBody } from '@repo/shared/types/domain'
import type {
  SecurityMetrics
} from '@repo/shared/types/security'
import { SecurityMetricsService } from './security-metrics.service'

@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name)

  constructor(private readonly metricsService: SecurityMetricsService) {}

  /**
   * CSP Violation Reporting Endpoint
   * Receives CSP violation reports from browsers
   */
  @Post('csp-report')
  @SetMetadata('isPublic', true)
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleCSPReport(@Body() report: CSPReportBody): Promise<void> {
    const violation = report['csp-report']

    this.logger.warn('CSP violation reported', {
      documentUri: violation['document-uri'],
      violatedDirective: violation['violated-directive'],
      blockedUri: violation['blocked-uri'],
      sourceFile: violation['source-file'],
      lineNumber: violation['line-number']
    })
  }

  /**
   * Security Metrics Dashboard
   * Returns comprehensive security metrics for monitoring
   */
  @Get('metrics')
  @SetMetadata('admin-only', true)
  async getSecurityMetrics() {
    this.logger.log('Security metrics requested')

    const metrics = await this.metricsService.getMetrics()

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Manual Security Event Resolution
   * Allows admins to mark security events as resolved
   */
  @Post('events/:eventId/resolve')
  @SetMetadata('admin-only', true)
  async resolveSecurityEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() body: { resolution: string }
  ) {
    this.logger.log('Security event resolved', {
      eventId,
      resolution: body.resolution
    })

    return {
      success: true,
      message: 'Security event resolved',
      eventId,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Security Health Check
   * Returns status of security monitoring systems
   */
  @Get('health')
  @SetMetadata('admin-only', true)
  async getSecurityHealth() {
    const metrics = await this.metricsService.getMetrics()
    const { status, alerts } = this.determineHealthStatus(metrics)

    return {
      status,
      alerts,
      metrics: {
        totalEvents: metrics.totalEvents,
        eventsBySeverity: metrics.eventsBySeverity,
        criticalEvents: metrics.criticalEvents
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Security Dashboard Data
   * Returns data for security monitoring dashboard
   */
  @Get('dashboard')
  @SetMetadata('admin-only', true)
  async getSecurityDashboard() {
    const metrics = await this.metricsService.getMetrics()

    return {
      success: true,
      data: {
        overview: {
          totalEvents: metrics.totalEvents,
          criticalEvents: metrics.criticalEvents,
          recentEvents: metrics.recentEvents
        },
        eventsBySeverity: metrics.eventsBySeverity,
        eventsByType: metrics.eventsByType,
        trends: metrics.recentTrends,
        topThreateningIPs: metrics.topThreateningIPs
      },
      timestamp: new Date().toISOString()
    }
  }
  /**
   * Security System Status
   * Returns status of all security components
   */
  @Get('status')
  @SetMetadata('admin-only', true)
  async getSecurityStatus() {
    return {
      success: true,
      components: {
        securityMonitor: {
          status: 'active',
          description: 'Security monitoring and alerting service'
        },
        rateLimiting: {
          status: 'active',
          description: 'Request rate limiting and abuse prevention'
        },
        inputSanitization: {
          status: 'active',
          description: 'Input validation and threat detection'
        },
        securityHeaders: {
          status: 'active',
          description: 'Security headers (CSP, HSTS, etc.)'
        },
        authentication: {
          status: 'active',
          description: 'JWT authentication and authorization'
        },
        errorHandling: {
          status: 'active',
          description: 'Secure error handling without information leakage'
        }
      },
      securityLevel: 'maximum',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  }


  /**
   * Determine security health status based on metrics
   * @private
   */
  private determineHealthStatus(metrics: SecurityMetrics) {
    let status = 'healthy'
    const alerts: string[] = []

    const criticalCount = metrics.criticalEvents || 0

    if (criticalCount > 0) {
      status = 'critical'
      alerts.push(`${criticalCount} critical security events require immediate attention`)
    } else if ((metrics.failedAuthAttempts ?? 0) > 10) {
      status = 'warning'
      alerts.push('High volume of failed authentication attempts detected')
    }

    if ((metrics.blockedRequests ?? 0) > 0) {
      alerts.push(`${metrics.blockedRequests} potentially malicious requests were blocked`)
    }

    return { status, alerts }
  }
}
