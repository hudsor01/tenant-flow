import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * Security event types for comprehensive monitoring
 */
export enum SecurityEventType {
    // Authentication events
    AUTH_SUCCESS = 'auth_success',
    AUTH_FAILURE = 'auth_failure',
    AUTH_TOKEN_INVALID = 'auth_token_invalid',
    AUTH_RATE_LIMIT = 'auth_rate_limit',
    
    // Input validation events
    VALIDATION_FAILURE = 'validation_failure',
    INJECTION_ATTEMPT = 'injection_attempt',
    XSS_ATTEMPT = 'xss_attempt',
    PATH_TRAVERSAL = 'path_traversal',
    
    // Database security events
    RLS_BYPASS_ATTEMPT = 'rls_bypass_attempt',
    UNAUTHORIZED_QUERY = 'unauthorized_query',
    SUSPICIOUS_PATTERN = 'suspicious_pattern',
    
    // API security events
    RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
    FORBIDDEN_ACCESS = 'forbidden_access',
    SUSPICIOUS_REQUEST = 'suspicious_request',
    
    // System security events
    CONFIG_ACCESS = 'config_access',
    ADMIN_ACTION = 'admin_action',
    SYSTEM_ERROR = 'system_error'
}

/**
 * Security event severity levels
 */
export enum SecuritySeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

/**
 * Security event interface
 */
export interface SecurityEvent {
    type: SecurityEventType
    severity: SecuritySeverity
    timestamp: Date
    userId?: string
    ipAddress?: string
    userAgent?: string
    resource?: string
    action?: string
    details: Record<string, unknown>
    metadata?: {
        requestId?: string
        sessionId?: string
        correlationId?: string
    }
}

/**
 * Security metrics interface
 */
export interface SecurityMetrics {
    totalEvents: number
    eventsByType: Record<SecurityEventType, number>
    eventsBySeverity: Record<SecuritySeverity, number>
    suspiciousIPs: string[]
    failedAuthAttempts: number
    blockedRequests: number
    timeRange: {
        start: Date
        end: Date
    }
}

/**
 * Comprehensive security monitoring and logging service
 * Provides real-time security event tracking, alerting, and metrics
 */
@Injectable()
export class SecurityMonitorService {
    private readonly logger = new Logger(SecurityMonitorService.name)
    private readonly events: SecurityEvent[] = []
    private readonly suspiciousIPs = new Map<string, number>()
    private readonly failedAuthAttempts = new Map<string, number>()
    
    // Configuration
    private readonly maxEventsToStore: number
    private readonly suspiciousThreshold: number
    private readonly alertingEnabled: boolean

    constructor(private configService: ConfigService) {
        this.maxEventsToStore = this.configService.get<number>('SECURITY_MAX_EVENTS', 10000)
        this.suspiciousThreshold = this.configService.get<number>('SECURITY_SUSPICIOUS_THRESHOLD', 5)
        this.alertingEnabled = this.configService.get<boolean>('SECURITY_ALERTING_ENABLED', true)
        
        this.logger.log('Security monitoring service initialized', {
            maxEventsToStore: this.maxEventsToStore,
            suspiciousThreshold: this.suspiciousThreshold,
            alertingEnabled: this.alertingEnabled
        })
        
        // Start periodic cleanup
        this.startPeriodicCleanup()
    }

    /**
     * Log a security event with comprehensive details
     */
    logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: new Date()
        }

        // Add to in-memory store
        this.events.push(fullEvent)
        
        // Maintain event limit
        if (this.events.length > this.maxEventsToStore) {
            this.events.shift()
        }

        // Update suspicious IP tracking
        if (event.ipAddress && this.isSuspiciousEvent(event.type)) {
            this.trackSuspiciousIP(event.ipAddress)
        }

        // Update failed auth tracking
        if (event.type === SecurityEventType.AUTH_FAILURE && event.userId) {
            this.trackFailedAuth(event.userId)
        }

        // Log based on severity
        this.logEventBySeverity(fullEvent)

        // Trigger alerts for critical events
        if (event.severity === SecuritySeverity.CRITICAL && this.alertingEnabled) {
            this.triggerSecurityAlert(fullEvent)
        }
    }

    /**
     * Log authentication success
     */
    logAuthSuccess(userId: string, ipAddress?: string, userAgent?: string): void {
        this.logSecurityEvent({
            type: SecurityEventType.AUTH_SUCCESS,
            severity: SecuritySeverity.LOW,
            userId,
            ipAddress,
            userAgent,
            details: {
                action: 'login_success'
            }
        })
        
        // Clear failed attempts on successful auth
        if (userId) {
            this.failedAuthAttempts.delete(userId)
        }
    }

    /**
     * Log authentication failure
     */
    logAuthFailure(
        reason: string, 
        userId?: string, 
        ipAddress?: string, 
        userAgent?: string
    ): void {
        this.logSecurityEvent({
            type: SecurityEventType.AUTH_FAILURE,
            severity: SecuritySeverity.MEDIUM,
            userId,
            ipAddress,
            userAgent,
            details: {
                reason,
                action: 'login_failure'
            }
        })
    }

    /**
     * Log injection attempt
     */
    logInjectionAttempt(
        injectionType: 'sql' | 'xss' | 'command',
        payload: string,
        userId?: string,
        ipAddress?: string,
        resource?: string
    ): void {
        this.logSecurityEvent({
            type: SecurityEventType.INJECTION_ATTEMPT,
            severity: SecuritySeverity.HIGH,
            userId,
            ipAddress,
            resource,
            details: {
                injectionType,
                payload: payload.substring(0, 500), // Limit payload size
                action: 'injection_blocked'
            }
        })
    }

    /**
     * Log validation failure
     */
    logValidationFailure(
        validationType: string,
        errors: string[],
        userId?: string,
        ipAddress?: string,
        resource?: string
    ): void {
        this.logSecurityEvent({
            type: SecurityEventType.VALIDATION_FAILURE,
            severity: SecuritySeverity.MEDIUM,
            userId,
            ipAddress,
            resource,
            details: {
                validationType,
                errors,
                action: 'validation_failed'
            }
        })
    }

    /**
     * Log RLS bypass attempt
     */
    logRLSBypassAttempt(
        userId: string,
        targetUserId: string,
        resource: string,
        ipAddress?: string
    ): void {
        this.logSecurityEvent({
            type: SecurityEventType.RLS_BYPASS_ATTEMPT,
            severity: SecuritySeverity.CRITICAL,
            userId,
            ipAddress,
            resource,
            details: {
                targetUserId,
                action: 'rls_bypass_blocked'
            }
        })
    }

    /**
     * Log rate limit exceeded
     */
    logRateLimitExceeded(
        rateLimitType: string,
        limit: number,
        userId?: string,
        ipAddress?: string
    ): void {
        this.logSecurityEvent({
            type: SecurityEventType.RATE_LIMIT_EXCEEDED,
            severity: SecuritySeverity.MEDIUM,
            userId,
            ipAddress,
            details: {
                rateLimitType,
                limit,
                action: 'rate_limit_blocked'
            }
        })
    }

    /**
     * Get security metrics for monitoring dashboard
     */
    getSecurityMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
        const filteredEvents = timeRange
            ? this.events.filter(event => 
                event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
            )
            : this.events

        const eventsByType: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>
        const eventsBySeverity: Record<SecuritySeverity, number> = {} as Record<SecuritySeverity, number>

        // Initialize counters
        Object.values(SecurityEventType).forEach(type => {
            eventsByType[type] = 0
        })
        Object.values(SecuritySeverity).forEach(severity => {
            eventsBySeverity[severity] = 0
        })

        // Count events
        filteredEvents.forEach(event => {
            eventsByType[event.type]++
            eventsBySeverity[event.severity]++
        })

        return {
            totalEvents: filteredEvents.length,
            eventsByType,
            eventsBySeverity,
            suspiciousIPs: Array.from(this.suspiciousIPs.keys()),
            failedAuthAttempts: Array.from(this.failedAuthAttempts.values()).reduce((a, b) => a + b, 0),
            blockedRequests: eventsByType[SecurityEventType.INJECTION_ATTEMPT] + 
                           eventsByType[SecurityEventType.RATE_LIMIT_EXCEEDED],
            timeRange: timeRange || {
                start: this.events[0]?.timestamp || new Date(),
                end: new Date()
            }
        }
    }

    /**
     * Get recent security events with optional filtering
     */
    getRecentEvents(
        limit = 100,
        severity?: SecuritySeverity,
        type?: SecurityEventType
    ): SecurityEvent[] {
        let filteredEvents = [...this.events]

        if (severity) {
            filteredEvents = filteredEvents.filter(event => event.severity === severity)
        }

        if (type) {
            filteredEvents = filteredEvents.filter(event => event.type === type)
        }

        return filteredEvents
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit)
    }

    /**
     * Check if an IP address is suspicious
     */
    isSuspiciousIP(ipAddress: string): boolean {
        const count = this.suspiciousIPs.get(ipAddress) || 0
        return count >= this.suspiciousThreshold
    }

    /**
     * Get security status summary
     */
    getSecurityStatus(): {
        status: 'secure' | 'warning' | 'critical'
        alerts: string[]
        metrics: SecurityMetrics
    } {
        const metrics = this.getSecurityMetrics()
        const alerts: string[] = []
        let status: 'secure' | 'warning' | 'critical' = 'secure'

        // Check for critical events in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
        const recentCritical = this.events.filter(event => 
            event.timestamp >= oneHourAgo && event.severity === SecuritySeverity.CRITICAL
        )

        if (recentCritical.length > 0) {
            status = 'critical'
            alerts.push(`${recentCritical.length} critical security events in the last hour`)
        }

        // Check for high number of failed auth attempts
        if (metrics.failedAuthAttempts > 50) {
            status = status === 'critical' ? 'critical' : 'warning'
            alerts.push(`High number of failed authentication attempts: ${metrics.failedAuthAttempts}`)
        }

        // Check for suspicious IPs
        if (metrics.suspiciousIPs.length > 0) {
            status = status === 'critical' ? 'critical' : 'warning'
            alerts.push(`${metrics.suspiciousIPs.length} suspicious IP addresses detected`)
        }

        return { status, alerts, metrics }
    }

    /**
     * Private helper methods
     */
    private isSuspiciousEvent(type: SecurityEventType): boolean {
        return [
            SecurityEventType.AUTH_FAILURE,
            SecurityEventType.INJECTION_ATTEMPT,
            SecurityEventType.XSS_ATTEMPT,
            SecurityEventType.PATH_TRAVERSAL,
            SecurityEventType.RLS_BYPASS_ATTEMPT,
            SecurityEventType.RATE_LIMIT_EXCEEDED
        ].includes(type)
    }

    private trackSuspiciousIP(ipAddress: string): void {
        const current = this.suspiciousIPs.get(ipAddress) || 0
        this.suspiciousIPs.set(ipAddress, current + 1)
    }

    private trackFailedAuth(userId: string): void {
        const current = this.failedAuthAttempts.get(userId) || 0
        this.failedAuthAttempts.set(userId, current + 1)
    }

    private logEventBySeverity(event: SecurityEvent): void {
        const logMessage = `Security event: ${event.type}`;
        const context = {
            type: event.type,
            severity: event.severity,
            userId: event.userId,
            ipAddress: event.ipAddress,
            resource: event.resource,
            details: event.details
        }

        switch (event.severity) {
            case SecuritySeverity.LOW:
                this.logger.debug(logMessage, context)
                break
            case SecuritySeverity.MEDIUM:
                this.logger.warn(logMessage, context)
                break
            case SecuritySeverity.HIGH:
                this.logger.error(logMessage, context)
                break
            case SecuritySeverity.CRITICAL:
                this.logger.error(`🚨 CRITICAL SECURITY EVENT: ${logMessage}`, context)
                break
        }
    }

    private triggerSecurityAlert(event: SecurityEvent): void {
        // In a production environment, this would integrate with:
        // - Email/SMS alerting systems
        // - Slack/Teams notifications
        // - Security monitoring platforms (SIEM)
        // - Incident management systems
        
        this.logger.error('🚨 SECURITY ALERT TRIGGERED', {
            event,
            alertTime: new Date().toISOString(),
            alertType: 'critical_security_event'
        })
        
        // For now, just log the alert
        // TODO: Implement actual alerting mechanisms
    }

    private startPeriodicCleanup(): void {
        // Clean up old events and reset counters every hour
        setInterval(() => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            
            // Remove events older than 1 week
            const initialLength = this.events.length
            const filtered = this.events.filter(event => event.timestamp >= oneWeekAgo)
            this.events.length = 0
            this.events.push(...filtered)
            
            if (initialLength !== this.events.length) {
                this.logger.debug('Cleaned up old security events', {
                    removed: initialLength - this.events.length,
                    remaining: this.events.length
                })
            }
            
            // Reset counters for IPs and users with no recent activity
            this.cleanupCounters(oneWeekAgo)
            
        }, 60 * 60 * 1000) // Run every hour
    }

    private cleanupCounters(cutoffDate: Date): void {
        // Clean up suspicious IP counters
        const recentEvents = this.events.filter(event => event.timestamp >= cutoffDate)
        const activeIPs = new Set(recentEvents.map(event => event.ipAddress).filter(Boolean))
        
        for (const ip of this.suspiciousIPs.keys()) {
            if (!activeIPs.has(ip)) {
                this.suspiciousIPs.delete(ip)
            }
        }
        
        // Clean up failed auth counters
        const activeUsers = new Set(recentEvents.map(event => event.userId).filter(Boolean))
        
        for (const userId of this.failedAuthAttempts.keys()) {
            if (!activeUsers.has(userId)) {
                this.failedAuthAttempts.delete(userId)
            }
        }
    }
}