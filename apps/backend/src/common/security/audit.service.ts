import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { 
    SecurityEventType, 
    SecurityEventSeverity, 
    SecurityAuditLog 
} from '@tenantflow/shared/types/security'


/**
 * Centralized security audit service for logging and analyzing security events
 */
@Injectable()
export class SecurityAuditService {
    private readonly logger = new Logger(SecurityAuditService.name)
    
    // Rate limiting for audit logs to prevent spam
    private readonly auditRateLimit = new Map<string, number>()
    private readonly RATE_LIMIT_WINDOW = 60000 // 1 minute
    private readonly MAX_LOGS_PER_WINDOW = 100

    constructor(private prisma: PrismaService) {}

    /**
     * Log a security event with automatic severity assessment and rate limiting
     */
    async logSecurityEvent(event: Omit<SecurityAuditLog, 'id' | 'severity' | 'timestamp'>): Promise<void> {
        try {
            // Apply rate limiting per IP or user
            const rateLimitKey = event.ipAddress || event.userId || 'anonymous'
            if (this.isRateLimited(rateLimitKey)) {
                this.logger.warn(`Rate limit exceeded for security audit logs: ${rateLimitKey}`)
                return
            }

            const severity = this.calculateSeverity(event.eventType, event.details)
            const auditLog: SecurityAuditLog = {
                ...event,
                severity,
                timestamp: new Date()
            }

            // Store in database
            await this.persistAuditLog(auditLog)

            // Log to application logger based on severity
            this.logToAppLogger(auditLog)

            // For critical events, trigger immediate alerts
            if (severity === SecurityEventSeverity.CRITICAL) {
                await this.handleCriticalEvent(auditLog)
            }
        } catch (error) {
            this.logger.error('Failed to log security event', error)
            // Fallback to app logger only
            this.logger.error(`SECURITY EVENT: ${JSON.stringify(event)}`)
        }
    }

    /**
     * Quick log method for common auth events
     */
    async logAuthEvent(
        type: SecurityEventType.AUTH_ATTEMPT | SecurityEventType.AUTH_SUCCESS | SecurityEventType.AUTH_FAILURE,
        userId?: string,
        email?: string,
        ipAddress?: string,
        userAgent?: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        await this.logSecurityEvent({
            eventType: type,
            userId: userId || undefined,
            ipAddress,
            userAgent,
            email,
            resource: 'auth',
            action: type.toLowerCase(),
            details: typeof details === 'string' ? details : JSON.stringify(details || {}),
            metadata: {
                email,
                resource: 'auth',
                action: type.toLowerCase(),
                ...(typeof details === 'object' ? details : {})
            }
        })
    }

    /**
     * Quick log method for permission denial events
     */
    async logPermissionDenied(
        userId: string,
        resource: string,
        action: string,
        ipAddress?: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        await this.logSecurityEvent({
            eventType: SecurityEventType.PERMISSION_DENIED,
            userId,
            ipAddress,
            resource,
            action,
            details: typeof details === 'string' ? details : JSON.stringify(details || {})
        })
    }

    /**
     * Quick log method for suspicious activity
     */
    async logSuspiciousActivity(
        reason: string,
        userId?: string,
        ipAddress?: string,
        userAgent?: string,
        details?: Record<string, unknown>
    ): Promise<void> {
        await this.logSecurityEvent({
            eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
            userId,
            ipAddress,
            userAgent,
            resource: 'security',
            action: 'suspicious_activity',
            details: JSON.stringify({ reason, ...details })
        })
    }

    /**
     * Get security events with filtering and pagination
     */
    async getSecurityEvents(filters: {
        eventType?: SecurityEventType
        severity?: SecurityEventSeverity
        userId?: string
        ipAddress?: string
        startDate?: Date
        endDate?: Date
        limit?: number
        offset?: number
    }): Promise<{ events: SecurityAuditLog[]; total: number }> {
        try {
            interface AuditLogWhere {
                eventType?: SecurityEventType
                severity?: SecurityEventSeverity
                userId?: string
                ipAddress?: string
                timestamp?: {
                    gte?: Date
                    lte?: Date
                }
            }
            const where: AuditLogWhere = {}
            
            if (filters.eventType) where.eventType = filters.eventType
            if (filters.severity) where.severity = filters.severity
            if (filters.userId) where.userId = filters.userId
            if (filters.ipAddress) where.ipAddress = filters.ipAddress
            if (filters.startDate || filters.endDate) {
                where.timestamp = {}
                if (filters.startDate) where.timestamp.gte = filters.startDate
                if (filters.endDate) where.timestamp.lte = filters.endDate
            }

            const [events, total] = await Promise.all([
                this.prisma.securityAuditLog.findMany({
                    where,
                    orderBy: { timestamp: 'desc' },
                    skip: filters.offset || 0,
                    take: filters.limit || 50,
                }) as any,
                this.prisma.securityAuditLog.count({ where }),
            ]);

            return { events, total }
        } catch (error) {
            this.logger.error('Failed to fetch security events', error)
            return { events: [], total: 0 }
        }
    }

    /**
     * Get security statistics for dashboard
     */
    async getSecurityStats(days = 30): Promise<{
        totalEvents: number
        criticalEvents: number
        topEventTypes: { type: string; count: number }[]
        topIpAddresses: { ip: string; count: number }[]
        eventsByDay: { date: string; count: number }[]
    }> {
        try {
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - days)

            const events = await this.prisma.securityAuditLog.findMany({
                where: {
                    timestamp: { gte: startDate }
                },
                select: {
                    eventType: true,
                    severity: true,
                    ipAddress: true,
                    timestamp: true
                }
            })

            const totalEvents = events.length
            const criticalEvents = events.filter(e => e.severity === SecurityEventSeverity.CRITICAL).length

            // Group by event type
            const eventTypeCounts = events.reduce((acc, event) => {
                const key = event.eventType as string
                acc[key] = (acc[key] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            const topEventTypes = Object.entries(eventTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([type, count]) => ({ type, count }))

            // Group by IP address
            const ipCounts = events.reduce((acc, event) => {
                if (event.ipAddress) {
                    acc[event.ipAddress] = (acc[event.ipAddress] || 0) + 1
                }
                return acc
            }, {} as Record<string, number>)

            const topIpAddresses = Object.entries(ipCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([ip, count]) => ({ ip, count }))

            // Group by day
            const eventsByDay = events.reduce((acc, event) => {
                const date = event.timestamp.toISOString().split('T')[0]
                if (date) {
                    acc[date] = (acc[date] || 0) + 1
                }
                return acc
            }, {} as Record<string, number>)

            const eventsByDayArray = Object.entries(eventsByDay)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, count]) => ({ date, count }))

            return {
                totalEvents,
                criticalEvents,
                topEventTypes,
                topIpAddresses,
                eventsByDay: eventsByDayArray
            }
        } catch (error) {
            this.logger.error('Failed to get security stats', error)
            return {
                totalEvents: 0,
                criticalEvents: 0,
                topEventTypes: [],
                topIpAddresses: [],
                eventsByDay: []
            }
        }
    }

    /**
     * Clean up old audit logs to prevent unbounded growth
     */
    async cleanupOldLogs(retentionDays = 90): Promise<number> {
        try {
            const cutoffDate = new Date()
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

            const result = await this.prisma.securityAuditLog.deleteMany({
                where: {
                    timestamp: { lt: cutoffDate },
                    severity: { not: SecurityEventSeverity.CRITICAL } // Keep critical events longer
                }
            })

            this.logger.log(`Cleaned up ${result.count} old audit logs`)
            return result.count
        } catch (error) {
            this.logger.error('Failed to cleanup old audit logs', error)
            return 0
        }
    }

    /**
     * Calculate event severity based on type and context
     */
    private calculateSeverity(eventType: SecurityEventType, details?: string | Record<string, unknown>): SecurityEventSeverity {
        const severityMap: Record<SecurityEventType, SecurityEventSeverity> = {
            [SecurityEventType.AUTH_ATTEMPT]: SecurityEventSeverity.LOW,
            [SecurityEventType.AUTH_SUCCESS]: SecurityEventSeverity.LOW,
            [SecurityEventType.AUTH_FAILURE]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.AUTH_TOKEN_INVALID]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.AUTH_RATE_LIMIT]: SecurityEventSeverity.HIGH,
            [SecurityEventType.PASSWORD_CHANGE]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.TOKEN_REFRESH]: SecurityEventSeverity.LOW,
            [SecurityEventType.SESSION_INVALIDATED]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.ACCOUNT_LOCKED]: SecurityEventSeverity.HIGH,
            [SecurityEventType.PERMISSION_DENIED]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.FORBIDDEN_ACCESS]: SecurityEventSeverity.HIGH,
            [SecurityEventType.RLS_BYPASS_ATTEMPT]: SecurityEventSeverity.CRITICAL,
            [SecurityEventType.UNAUTHORIZED_QUERY]: SecurityEventSeverity.HIGH,
            [SecurityEventType.VALIDATION_FAILURE]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.INVALID_INPUT_DETECTED]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.INJECTION_ATTEMPT]: SecurityEventSeverity.CRITICAL,
            [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecurityEventSeverity.CRITICAL,
            [SecurityEventType.XSS_ATTEMPT]: SecurityEventSeverity.CRITICAL,
            [SecurityEventType.CSRF_ATTEMPT]: SecurityEventSeverity.HIGH,
            [SecurityEventType.PATH_TRAVERSAL]: SecurityEventSeverity.CRITICAL,
            [SecurityEventType.FILE_UPLOAD_BLOCKED]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.SUSPICIOUS_ACTIVITY]: SecurityEventSeverity.HIGH,
            [SecurityEventType.SUSPICIOUS_REQUEST]: SecurityEventSeverity.HIGH,
            [SecurityEventType.SUSPICIOUS_PATTERN]: SecurityEventSeverity.HIGH,
            [SecurityEventType.ADMIN_ACTION]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.DATA_EXPORT]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.CONFIGURATION_CHANGE]: SecurityEventSeverity.HIGH,
            [SecurityEventType.CONFIG_ACCESS]: SecurityEventSeverity.MEDIUM,
            [SecurityEventType.SYSTEM_ERROR]: SecurityEventSeverity.MEDIUM
        }

        let severity = severityMap[eventType] || SecurityEventSeverity.MEDIUM

        // Increase severity based on context
        if (typeof details === 'object' && details) {
            if (details.repeated === true) {
                severity = this.increaseSeverity(severity)
            }
            if (details.adminUser === true) {
                severity = this.increaseSeverity(severity)
            }
            if (details.multipleFailures && typeof details.multipleFailures === 'number' && details.multipleFailures > 5) {
                severity = this.increaseSeverity(severity)
            }
        }

        return severity
    }

    private increaseSeverity(current: SecurityEventSeverity): SecurityEventSeverity {
        switch (current) {
            case SecurityEventSeverity.LOW: return SecurityEventSeverity.MEDIUM
            case SecurityEventSeverity.MEDIUM: return SecurityEventSeverity.HIGH
            case SecurityEventSeverity.HIGH: return SecurityEventSeverity.CRITICAL
            default: return current
        }
    }

    /**
     * Store audit log in database
     */
    private async persistAuditLog(auditLog: SecurityAuditLog): Promise<void> {
        await this.prisma.securityAuditLog.create({
            data: {
                eventType: auditLog.eventType,
                severity: auditLog.severity,
                userId: auditLog.userId || null,
                email: auditLog.email || null,
                ipAddress: auditLog.ipAddress || null,
                userAgent: auditLog.userAgent || null,
                resource: auditLog.resource || null,
                action: auditLog.action || null,
                details: auditLog.details as any || {},
                timestamp: auditLog.timestamp
            }
        })
    }

    /**
     * Log to application logger based on severity
     */
    private logToAppLogger(auditLog: SecurityAuditLog): void {
        const logMessage = `SECURITY EVENT: ${auditLog.eventType} - ${JSON.stringify({
            severity: auditLog.severity,
            userId: auditLog.userId,
            resource: auditLog.resource,
            action: auditLog.action,
            ip: auditLog.ipAddress
        })}`

        switch (auditLog.severity) {
            case SecurityEventSeverity.CRITICAL:
            case SecurityEventSeverity.HIGH:
                this.logger.error(logMessage)
                break
            case SecurityEventSeverity.MEDIUM:
                this.logger.warn(logMessage)
                break
            default:
                this.logger.log(logMessage)
        }
    }

    /**
     * Handle critical security events with immediate alerts
     */
    private async handleCriticalEvent(auditLog: SecurityAuditLog): Promise<void> {
        // Log to critical events
        this.logger.error(`CRITICAL SECURITY EVENT: ${JSON.stringify(auditLog)}`)

        // TODO: Implement alerting mechanisms (GitHub Issue #1)
        // - Send to SIEM system
        // - Send email alerts to security team
        // - Send to monitoring systems (DataDog, New Relic, etc.)
        // - Trigger incident response workflow

        // For now, just ensure it's prominently logged
        console.error('🚨 CRITICAL SECURITY EVENT DETECTED 🚨', auditLog)
    }

    /**
     * Rate limiting for audit logs
     */
    private isRateLimited(key: string): boolean {
        const now = Date.now()
        const windowStart = now - this.RATE_LIMIT_WINDOW
        
        // Clean old entries
        this.auditRateLimit.forEach((timestamp, k) => {
            if (timestamp < windowStart) {
                this.auditRateLimit.delete(k)
            }
        })

        // Count current requests in window
        let count = 0
        this.auditRateLimit.forEach((timestamp, k) => {
            if (k.startsWith(key) && timestamp >= windowStart) {
                count++
            }
        })

        if (count >= this.MAX_LOGS_PER_WINDOW) {
            return true
        }

        // Add current request
        this.auditRateLimit.set(`${key}-${now}`, now)
        return false
    }
}