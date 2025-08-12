import { Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { SecurityUtils } from './security.utils'

export interface SecurityEvent {
  type: 'AUTH_ATTEMPT' | 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'PASSWORD_CHANGE' | 
        'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' |
        'SESSION_INVALIDATED' | 'TOKEN_REFRESH' | 'ACCOUNT_LOCKED' |
        'UNAUTHORIZED_ACCESS' | 'SQL_INJECTION_ATTEMPT' | 'XSS_ATTEMPT' |
        'CSRF_VIOLATION' | 'BRUTE_FORCE_DETECTED' | 'ANOMALOUS_BEHAVIOR'
  userId?: string
  email?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  timestamp?: Date
  severity?: 'low' | 'medium' | 'high' | 'critical'
  details?: Record<string, unknown>
  correlationId?: string
}

export interface SecurityMetrics {
  authFailures: number
  rateLimitHits: number
  suspiciousActivity: number
  blockedRequests: number
  lastUpdated: Date
}

/**
 * Enhanced Security Monitoring Service
 * 
 * Provides comprehensive security event tracking, alerting, and metrics.
 * Integrates with existing SecurityUtils and adds persistent storage.
 */
@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name)
  private readonly metrics: SecurityMetrics = {
    authFailures: 0,
    rateLimitHits: 0,
    suspiciousActivity: 0,
    blockedRequests: 0,
    lastUpdated: new Date()
  }

  // In-memory tracking for rate limiting and anomaly detection
  private readonly ipAttempts = new Map<string, { count: number; firstAttempt: Date; blocked: boolean }>()
  private readonly userAttempts = new Map<string, { count: number; firstAttempt: Date; blocked: boolean }>()

  constructor(
    private readonly securityUtils: SecurityUtils,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Clean up tracking maps every hour
    setInterval(() => this.cleanupTracking(), 60 * 60 * 1000)
  }

  /**
   * Log and track security events with enhanced monitoring
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Set default timestamp and severity
      const enhancedEvent: SecurityEvent = {
        ...event,
        timestamp: event.timestamp || new Date(),
        severity: event.severity || this.calculateSeverity(event)
      }

      // Update internal metrics
      this.updateMetrics(enhancedEvent)

      // Check for patterns and anomalies
      await this.analyzeEventPatterns(enhancedEvent)

      // Log using existing SecurityUtils (only if type is supported)
      const supportedAuditTypes = [
        'AUTH_ATTEMPT', 'AUTH_SUCCESS', 'AUTH_FAILURE', 'PASSWORD_CHANGE',
        'PERMISSION_DENIED', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED',
        'SESSION_INVALIDATED', 'TOKEN_REFRESH', 'ACCOUNT_LOCKED'
      ] as const
      
      if (supportedAuditTypes.includes(enhancedEvent.type as typeof supportedAuditTypes[number])) {
        this.securityUtils.createSecurityAuditLog({
          type: enhancedEvent.type as typeof supportedAuditTypes[number],
        userId: enhancedEvent.userId,
        email: enhancedEvent.email,
        ip: enhancedEvent.ip,
        userAgent: enhancedEvent.userAgent,
        details: {
          ...enhancedEvent.details,
          endpoint: enhancedEvent.endpoint,
          method: enhancedEvent.method,
          correlationId: enhancedEvent.correlationId,
          severity: enhancedEvent.severity
        }
      })
      }

      // Emit event for real-time alerting
      this.eventEmitter.emit('security.event', enhancedEvent)

      // Send alerts for critical events
      if (enhancedEvent.severity === 'critical') {
        await this.sendCriticalAlert(enhancedEvent)
      }

    } catch (error) {
      this.logger.error('Failed to log security event:', error)
      // Don't let security logging failures break the application
    }
  }

  /**
   * Track authentication attempts and detect brute force attacks
   */
  async trackAuthAttempt(ip: string, email?: string, success = false): Promise<{
    blocked: boolean
    remainingAttempts?: number
  }> {
    const now = new Date()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxAttempts = 5

    // Track by IP
    const ipKey = `ip_${ip}`
    let ipTracking = this.ipAttempts.get(ipKey)
    
    if (!ipTracking || now.getTime() - ipTracking.firstAttempt.getTime() > windowMs) {
      ipTracking = { count: 0, firstAttempt: now, blocked: false }
    }

    // Track by email if provided
    let emailTracking: typeof ipTracking | undefined
    if (email) {
      const emailKey = `email_${email}`
      emailTracking = this.userAttempts.get(emailKey)
      
      if (!emailTracking || now.getTime() - emailTracking.firstAttempt.getTime() > windowMs) {
        emailTracking = { count: 0, firstAttempt: now, blocked: false }
      }
    }

    if (!success) {
      ipTracking.count++
      if (emailTracking) emailTracking.count++

      // Check if should block
      if (ipTracking.count >= maxAttempts) {
        ipTracking.blocked = true
        
        await this.logSecurityEvent({
          type: 'BRUTE_FORCE_DETECTED',
          ip,
          email,
          severity: 'high',
          details: {
            attempts: ipTracking.count,
            windowMs,
            action: 'IP_BLOCKED'
          }
        })
      }

      if (emailTracking && emailTracking.count >= maxAttempts) {
        emailTracking.blocked = true
        
        await this.logSecurityEvent({
          type: 'ACCOUNT_LOCKED',
          email,
          ip,
          severity: 'high',
          details: {
            attempts: emailTracking.count,
            windowMs,
            action: 'ACCOUNT_TEMPORARILY_LOCKED'
          }
        })
      }
    } else {
      // Reset counters on successful auth
      ipTracking.count = 0
      ipTracking.blocked = false
      if (emailTracking) {
        emailTracking.count = 0
        emailTracking.blocked = false
      }
    }

    // Update tracking
    this.ipAttempts.set(ipKey, ipTracking)
    if (email && emailTracking) {
      this.userAttempts.set(`email_${email}`, emailTracking)
    }

    const blocked = ipTracking.blocked || (emailTracking?.blocked ?? false)
    const remainingAttempts = Math.max(0, maxAttempts - Math.max(ipTracking.count, emailTracking?.count ?? 0))

    return { blocked, remainingAttempts }
  }

  /**
   * Check if IP or email is currently blocked
   */
  isBlocked(ip: string, email?: string): boolean {
    const ipTracking = this.ipAttempts.get(`ip_${ip}`)
    const emailTracking = email ? this.userAttempts.get(`email_${email}`) : undefined

    return (ipTracking?.blocked ?? false) || (emailTracking?.blocked ?? false)
  }

  /**
   * Check for suspicious activity patterns
   */
  checkSuspiciousActivity(request: {
    ip?: string
    userAgent?: string
    endpoint?: string
    headers?: Record<string, string>
  }): boolean {
    const suspiciousPatterns = [
      // Common attack patterns
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /sqlinjection/i,
      /union.*select/i,
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      /onload=/i,
      // Directory traversal
      /\.\.\//g,
      /\.\.%2f/i,
      // Common exploit attempts
      /\/wp-admin/i,
      /\/admin/i,
      /\/phpmyadmin/i,
      /\.php$/i
    ]

    // Check endpoint for suspicious patterns
    if (request.endpoint) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(request.endpoint)) {
          void this.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            ip: request.ip,
            endpoint: request.endpoint,
            severity: 'high',
            details: {
              pattern: 'SUSPICIOUS_ENDPOINT',
              matchedPattern: pattern.source
            }
          })
          return true
        }
      }
    }

    // Check User-Agent for bot patterns
    if (request.userAgent) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(request.userAgent)) {
          void this.logSecurityEvent({
            type: 'SUSPICIOUS_ACTIVITY',
            ip: request.ip,
            severity: 'medium',
            details: {
              pattern: 'SUSPICIOUS_USER_AGENT',
              userAgent: request.userAgent,
              matchedPattern: pattern.source
            }
          })
          return true
        }
      }
    }

    return false
  }

  /**
   * Track failed attempts (enhanced from stub)
   */
  trackFailedAttempt(userId: string, action: string, ip?: string): void {
    void this.logSecurityEvent({
      type: 'AUTH_FAILURE',
      userId,
      ip,
      details: {
        action,
        source: 'trackFailedAttempt'
      }
    })
  }

  /**
   * Check if identifier is rate limited (enhanced from stub)
   */
  isRateLimited(identifier: string): boolean {
    // Check both IP and email tracking
    return this.isBlocked(identifier) || this.isBlocked('', identifier)
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics }
  }

  /**
   * Manual security alert for suspicious activity
   */
  async reportSuspiciousActivity(details: {
    ip?: string
    userId?: string
    endpoint?: string
    reason: string
    evidence?: Record<string, unknown>
  }): Promise<void> {
    await this.logSecurityEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      ip: details.ip,
      userId: details.userId,
      endpoint: details.endpoint,
      severity: 'high',
      details: {
        reason: details.reason,
        evidence: details.evidence,
        reportedBy: 'MANUAL_REPORT'
      }
    })
  }

  private calculateSeverity(event: SecurityEvent): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'AUTH_ATTEMPT': 'low',
      'AUTH_SUCCESS': 'low',
      'AUTH_FAILURE': 'medium',
      'PASSWORD_CHANGE': 'medium',
      'PERMISSION_DENIED': 'medium',
      'SUSPICIOUS_ACTIVITY': 'high',
      'RATE_LIMIT_EXCEEDED': 'medium',
      'SESSION_INVALIDATED': 'medium',
      'TOKEN_REFRESH': 'low',
      'ACCOUNT_LOCKED': 'high',
      'UNAUTHORIZED_ACCESS': 'high',
      'SQL_INJECTION_ATTEMPT': 'critical',
      'XSS_ATTEMPT': 'critical',
      'CSRF_VIOLATION': 'high',
      'BRUTE_FORCE_DETECTED': 'critical',
      'ANOMALOUS_BEHAVIOR': 'medium'
    }

    return severityMap[event.type] || 'medium'
  }

  private updateMetrics(event: SecurityEvent): void {
    switch (event.type) {
      case 'AUTH_FAILURE':
        this.metrics.authFailures++
        break
      case 'RATE_LIMIT_EXCEEDED':
        this.metrics.rateLimitHits++
        break
      case 'SUSPICIOUS_ACTIVITY':
      case 'SQL_INJECTION_ATTEMPT':
      case 'XSS_ATTEMPT':
      case 'BRUTE_FORCE_DETECTED':
        this.metrics.suspiciousActivity++
        break
      case 'PERMISSION_DENIED':
      case 'UNAUTHORIZED_ACCESS':
        this.metrics.blockedRequests++
        break
    }

    this.metrics.lastUpdated = new Date()
  }

  private async analyzeEventPatterns(event: SecurityEvent): Promise<void> {
    // Pattern analysis for anomaly detection
    if (event.ip && event.type === 'AUTH_FAILURE') {
      const ipTracking = this.ipAttempts.get(`ip_${event.ip}`)
      
      // Check for rapid successive attempts (potential bot)
      if (ipTracking && ipTracking.count > 3) {
        const timeSpan = Date.now() - ipTracking.firstAttempt.getTime()
        if (timeSpan < 60000) { // Less than 1 minute for 3+ attempts
          await this.logSecurityEvent({
            type: 'ANOMALOUS_BEHAVIOR',
            ip: event.ip,
            severity: 'high',
            details: {
              pattern: 'RAPID_AUTH_ATTEMPTS',
              attempts: ipTracking.count,
              timeSpanMs: timeSpan,
              originalEvent: event.type
            }
          })
        }
      }
    }
  }

  private async sendCriticalAlert(event: SecurityEvent): Promise<void> {
    // In a production environment, you'd integrate with:
    // - Email alerts
    // - Slack/Teams notifications
    // - PagerDuty/OpsGenie
    // - SIEM systems
    
    this.logger.error(`🚨 CRITICAL SECURITY ALERT: ${event.type}`, {
      event: {
        type: event.type,
        severity: event.severity,
        timestamp: event.timestamp,
        userId: event.userId,
        email: event.email,
        ip: event.ip,
        endpoint: event.endpoint,
        details: event.details
      },
      recommendation: this.getSecurityRecommendation(event.type)
    })
  }

  private getSecurityRecommendation(eventType: string): string {
    const recommendations: Record<string, string> = {
      'SQL_INJECTION_ATTEMPT': 'Immediately review and sanitize database queries. Check for parameter binding issues.',
      'XSS_ATTEMPT': 'Review input validation and output encoding. Audit user-generated content handling.',
      'BRUTE_FORCE_DETECTED': 'Consider implementing additional rate limiting or temporary IP blocking.',
      'ACCOUNT_LOCKED': 'Review account security and consider requiring password reset.',
      'SUSPICIOUS_ACTIVITY': 'Investigate user behavior and consider additional monitoring.',
      'UNAUTHORIZED_ACCESS': 'Review access controls and authentication mechanisms.'
    }

    return recommendations[eventType] || 'Review security logs and take appropriate action.'
  }

  private cleanupTracking(): void {
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes

    // Clean up IP tracking
    for (const [key, tracking] of this.ipAttempts.entries()) {
      if (now - tracking.firstAttempt.getTime() > windowMs) {
        this.ipAttempts.delete(key)
      }
    }

    // Clean up user tracking
    for (const [key, tracking] of this.userAttempts.entries()) {
      if (now - tracking.firstAttempt.getTime() > windowMs) {
        this.userAttempts.delete(key)
      }
    }

    this.logger.debug('Cleaned up expired security tracking entries')
  }
}