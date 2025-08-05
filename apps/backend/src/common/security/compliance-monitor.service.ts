import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { SecurityAuditService } from './audit.service'
import { PrivacyService } from './privacy.service'
import { SecurityEventType, SecurityEventSeverity } from '@tenantflow/shared'

interface ComplianceStatus {
  overallScore: number
  fairHousingStatus?: {
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
  dataRetentionStatus?: {
    overdueRecords?: number
  }
  securityStatus?: {
    criticalEvents?: number
  }
}

/**
 * Compliance Monitoring Service
 * 
 * Automated monitoring and alerting for compliance violations
 * Runs scheduled checks and sends alerts for critical issues
 */
@Injectable()
export class ComplianceMonitorService {
  private readonly logger = new Logger(ComplianceMonitorService.name)

  constructor(
    private readonly auditService: SecurityAuditService,
    private readonly privacyService: PrivacyService
  ) {}

  /**
   * Daily compliance monitoring check
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runDailyComplianceCheck(): Promise<void> {
    this.logger.log('Starting daily compliance monitoring check')

    try {
      // Check for Fair Housing violations
      const fairHousingReport = await this.checkFairHousingCompliance()
      
      // Check data retention compliance
      const retentionReport = await this.checkDataRetentionCompliance()
      
      // Check security anomalies
      const securityReport = await this.checkSecurityAnomalies()

      // Generate overall compliance score
      const overallScore = this.calculateComplianceScore([
        fairHousingReport,
        retentionReport,
        securityReport
      ])

      // Send alerts if needed
      if (overallScore < 70) {
        await this.sendComplianceAlert('LOW_COMPLIANCE_SCORE', {
          score: overallScore,
          fairHousing: fairHousingReport,
          dataRetention: retentionReport,
          security: securityReport
        })
      }

      this.logger.log(`Daily compliance check completed. Score: ${overallScore}`)

    } catch (error) {
      this.logger.error('Daily compliance check failed', error)
      await this.sendComplianceAlert('MONITORING_FAILURE', { error: (error as Error).message })
    }
  }

  /**
   * Weekly data retention policy enforcement
   */
  @Cron(CronExpression.EVERY_WEEK)
  async enforceDataRetentionPolicies(): Promise<void> {
    this.logger.log('Starting weekly data retention policy enforcement')

    try {
      const result = await this.privacyService.enforceRetentionPolicies()
      
      if (result.errors.length > 0) {
        await this.sendComplianceAlert('RETENTION_POLICY_ERRORS', result)
      }

      this.logger.log(`Data retention completed. Processed: ${result.totalProcessed}`)

    } catch (error) {
      this.logger.error('Data retention enforcement failed', error)
      await this.sendComplianceAlert('RETENTION_FAILURE', { error: (error as Error).message })
    }
  }

  /**
   * Check Fair Housing compliance violations
   */
  private async checkFairHousingCompliance(): Promise<{ score: number; violations: number; riskLevel: string }> {
    const events = await this.auditService.getSecurityEvents({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 1000
    })

    const fairHousingEvents = events.events.filter(event =>
      event.details && 
      typeof event.details === 'string' &&
      event.details.includes('fair_housing_act')
    )

    const violations = fairHousingEvents.filter(event =>
      event.action?.includes('violation') || event.action?.includes('detected')
    ).length

    const totalChecks = fairHousingEvents.length
    const violationRate = totalChecks > 0 ? violations / totalChecks : 0
    const score = Math.max(0, 100 - (violationRate * 1000)) // Heavy penalty for violations

    let riskLevel = 'LOW'
    if (violationRate >= 0.1) riskLevel = 'CRITICAL'
    else if (violationRate >= 0.05) riskLevel = 'HIGH'
    else if (violationRate >= 0.02) riskLevel = 'MEDIUM'

    return { score, violations, riskLevel }
  }

  /**
   * Check data retention compliance
   */
  private async checkDataRetentionCompliance(): Promise<{ score: number; overdueRecords: number; riskLevel: string }> {
    // Check for records that should have been deleted based on retention policies
    const retentionThresholds = {
      audit_logs: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
      user_sessions: 30 * 24 * 60 * 60 * 1000 // 30 days
    }

    let overdueRecords = 0
    const now = Date.now()

    try {
      // Check audit logs
      const oldAuditLogs = await this.auditService.getSecurityEvents({
        endDate: new Date(now - retentionThresholds.audit_logs),
        limit: 1
      })
      
      if (oldAuditLogs.total > 0) {
        overdueRecords += oldAuditLogs.total
      }

      const score = overdueRecords > 1000 ? 50 : (overdueRecords > 100 ? 75 : 100)
      const riskLevel = overdueRecords > 1000 ? 'HIGH' : (overdueRecords > 100 ? 'MEDIUM' : 'LOW')

      return { score, overdueRecords, riskLevel }

    } catch (error) {
      this.logger.error('Data retention check failed', error)
      return { score: 0, overdueRecords: 0, riskLevel: 'CRITICAL' }
    }
  }

  /**
   * Check for security anomalies
   */
  private async checkSecurityAnomalies(): Promise<{ score: number; criticalEvents: number; riskLevel: string }> {
    const events = await this.auditService.getSecurityEvents({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      severity: SecurityEventSeverity.CRITICAL,
      limit: 100
    })

    const criticalEvents = events.total
    const score = Math.max(0, 100 - (criticalEvents * 10)) // 10 points per critical event

    let riskLevel = 'LOW'
    if (criticalEvents >= 5) riskLevel = 'CRITICAL'
    else if (criticalEvents >= 3) riskLevel = 'HIGH'
    else if (criticalEvents >= 1) riskLevel = 'MEDIUM'

    return { score, criticalEvents, riskLevel }
  }

  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(reports: { score: number }[]): number {
    const weights = [0.4, 0.3, 0.3] // Fair Housing, Data Retention, Security
    let totalScore = 0

    for (let i = 0; i < reports.length; i++) {
      totalScore += (reports[i]?.score || 0) * (weights[i] || 0)
    }

    return Math.round(totalScore)
  }

  /**
   * Send compliance alert
   */
  private async sendComplianceAlert(alertType: string, data: unknown): Promise<void> {
    // Log the alert
    await this.auditService.logSecurityEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      userId: 'system',
      resource: 'compliance_monitoring',
      action: 'alert_triggered',
      details: JSON.stringify({
        alertType,
        data,
        timestamp: new Date().toISOString()
      })
    })

    // In production, integrate with:
    // - Email alerts to compliance team
    // - Slack/Teams notifications
    // - SIEM system alerts
    // - Incident management system
    
    this.logger.warn(`COMPLIANCE ALERT: ${alertType}`, data)
    console.warn(`🚨 COMPLIANCE ALERT: ${alertType}`, data)
  }

  /**
   * Generate compliance dashboard data
   */
  async getComplianceDashboard(): Promise<{
    overallScore: number
    fairHousingStatus: unknown
    dataRetentionStatus: unknown
    securityStatus: unknown
    recentAlerts: unknown[]
    recommendations: string[]
  }> {
    try {
      const fairHousingStatus = await this.checkFairHousingCompliance()
      const dataRetentionStatus = await this.checkDataRetentionCompliance()
      const securityStatus = await this.checkSecurityAnomalies()
      
      const overallScore = this.calculateComplianceScore([
        fairHousingStatus,
        dataRetentionStatus,
        securityStatus
      ])

      // Get recent compliance alerts
      const recentAlerts = await this.auditService.getSecurityEvents({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        limit: 10
      })

      const recommendations = this.generateRecommendations({
        fairHousingStatus,
        dataRetentionStatus,
        securityStatus,
        overallScore
      })

      return {
        overallScore,
        fairHousingStatus,
        dataRetentionStatus,
        securityStatus,
        recentAlerts: recentAlerts.events,
        recommendations
      }

    } catch (error) {
      this.logger.error('Failed to generate compliance dashboard', error)
      throw error
    }
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(data: ComplianceStatus): string[] {
    const recommendations: string[] = []

    if (data.overallScore < 70) {
      recommendations.push('URGENT: Overall compliance score below acceptable threshold')
    }

    if (data.fairHousingStatus?.riskLevel === 'CRITICAL') {
      recommendations.push('Immediate Fair Housing Act compliance review required')
      recommendations.push('Staff training on protected class regulations needed')
    }

    if (data.dataRetentionStatus?.overdueRecords && data.dataRetentionStatus.overdueRecords > 100) {
      recommendations.push('Implement automated data retention policy enforcement')
    }

    if (data.securityStatus?.criticalEvents && data.securityStatus.criticalEvents > 0) {
      recommendations.push('Review and address critical security events')
    }

    if (recommendations.length === 0) {
      recommendations.push('Compliance status good - continue regular monitoring')
    }

    return recommendations
  }
}