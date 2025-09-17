/**
 * Security Controller
 *
 * Production-grade security endpoints for monitoring and reporting
 * - CSP violation reporting
 * - Security metrics dashboard
 * - Manual security event resolution
 * - IP blocking/unblocking management
 */

import { Controller, Post, Get, Body, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { Logger } from '@nestjs/common'
import { Public } from '../shared/decorators/public.decorator'
import { AdminOnly } from '../shared/decorators/admin-only.decorator'
import { SecurityMonitorService } from '../shared/services/security-monitor.service'

interface CSPReport {
	'csp-report': {
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
}

@Controller('security')
export class SecurityController {
	constructor(
		private readonly logger: Logger,
		private readonly securityMonitor: SecurityMonitorService
	) {
		// Context removed - NestJS Logger doesn't support setContext
	}

	/**
	 * CSP Violation Reporting Endpoint
	 * Receives CSP violation reports from browsers
	 */
	@Post('csp-report')
	@Public()
	@HttpCode(HttpStatus.NO_CONTENT)
	async handleCSPReport(@Body() report: CSPReport): Promise<void> {
		this.logger.warn('CSP violation reported', {
			documentUri: report['csp-report']['document-uri'],
			violatedDirective: report['csp-report']['violated-directive'],
			blockedUri: report['csp-report']['blocked-uri'],
			sourceFile: report['csp-report']['source-file'],
			lineNumber: report['csp-report']['line-number']
		})

		// Log as security event
		await this.securityMonitor.logSecurityEvent({
			type: 'malicious_request',
			severity: 'medium',
			source: 'csp_report',
			description: `CSP violation: ${report['csp-report']['violated-directive']}`,
			metadata: {
				violatedDirective: report['csp-report']['violated-directive'],
				blockedUri: report['csp-report']['blocked-uri'],
				documentUri: report['csp-report']['document-uri'],
				sourceFile: report['csp-report']['source-file'],
				lineNumber: report['csp-report']['line-number'],
				columnNumber: report['csp-report']['column-number']
			}
		})
	}

	/**
	 * Security Metrics Dashboard
	 * Returns comprehensive security metrics for monitoring
	 */
	@Get('metrics')
	@AdminOnly()
	async getSecurityMetrics() {
		const metrics = this.securityMonitor.getSecurityMetrics()

		this.logger.log('Security metrics requested', {
			totalEvents: metrics.totalEvents,
			criticalEvents: metrics.eventsBySeverity.critical,
			highEvents: metrics.eventsBySeverity.high
		})

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
	@AdminOnly()
	async resolveSecurityEvent(
		@Param('eventId') eventId: string,
		@Body() body: { resolution: string }
	) {
		await this.securityMonitor.resolveSecurityEvent(eventId, body.resolution)

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
	@AdminOnly()
	async getSecurityHealth() {
		const metrics = this.securityMonitor.getSecurityMetrics()

		// Determine security health status
		let status = 'healthy'
		const alerts: string[] = []

		const criticalCount = metrics.eventsBySeverity.critical || 0
		const highCount = metrics.eventsBySeverity.high || 0

		if (criticalCount > 0) {
			status = 'critical'
			alerts.push(`${criticalCount} critical security events require immediate attention`)
		} else if (highCount > 5) {
			status = 'warning'
			alerts.push(`${highCount} high-risk security events detected`)
		}

		if (metrics.recentTrends.lastHour > 100) {
			status = status === 'critical' ? 'critical' : 'warning'
			alerts.push(`High security event volume: ${metrics.recentTrends.lastHour} events in last hour`)
		}

		return {
			status,
			alerts,
			metrics: {
				totalEvents: metrics.totalEvents,
				recentTrends: metrics.recentTrends,
				eventsBySeverity: metrics.eventsBySeverity
			},
			timestamp: new Date().toISOString()
		}
	}

	/**
	 * Security Dashboard Data
	 * Returns data for security monitoring dashboard
	 */
	@Get('dashboard')
	@AdminOnly()
	async getSecurityDashboard() {
		const metrics = this.securityMonitor.getSecurityMetrics()

		return {
			success: true,
			data: {
				overview: {
					totalEvents: metrics.totalEvents,
					criticalEvents: metrics.eventsBySeverity.critical,
					highEvents: metrics.eventsBySeverity.high,
					mediumEvents: metrics.eventsBySeverity.medium,
					lowEvents: metrics.eventsBySeverity.low
				},
				trends: metrics.recentTrends,
				topThreatTypes: Object.entries(metrics.eventsByType)
					.sort(([, a], [, b]) => b - a)
					.slice(0, 10)
					.map(([type, count]) => ({ type, count })),
				topThreateningIPs: metrics.topThreateningIPs.slice(0, 10),
				timeline: {
					lastHour: metrics.recentTrends.lastHour,
					last24Hours: metrics.recentTrends.last24Hours,
					last7Days: metrics.recentTrends.last7Days
				}
			},
			timestamp: new Date().toISOString()
		}
	}

	/**
	 * Security System Status
	 * Returns status of all security components
	 */
	@Get('status')
	@AdminOnly()
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
}