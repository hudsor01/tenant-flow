/**
 * Security Metrics Service - Ultra-Native NestJS Implementation
 * Direct Supabase access, no repository abstraction
 */

import { Injectable, Logger } from '@nestjs/common'
import type {
	SecurityEvent,
	SecurityMetrics,
	SecurityThreatSummary,
	SecurityTrendPoint
} from '@repo/shared/types/security'
import {
	SecurityEventSeverity as SecurityEventSeverityEnum,
	SecurityEventType as SecurityEventTypeEnum
} from '@repo/shared/types/security'
import type { SecurityAuditLogEntry } from '@repo/shared/types/security-repository'
import { SupabaseService } from '../database/supabase.service'

const DEFAULT_LOOKBACK_DAYS = 30
const RECENT_EVENTS_LIMIT = 25
const TREND_WINDOW_DAYS = 14

@Injectable()
export class SecurityMetricsService {
	private readonly logger = new Logger(SecurityMetricsService.name)

	constructor(private readonly supabase: SupabaseService) {}

	async getMetrics(
		lookbackInDays: number = DEFAULT_LOOKBACK_DAYS
	): Promise<SecurityMetrics> {
		const end = new Date()
		const start = new Date(end.getTime() - lookbackInDays * 24 * 60 * 60 * 1000)

		// Direct Supabase query - no repository layer
		const client = this.supabase.getAdminClient()
		const { data, error } = await client
			.from('security_audit_log')
			.select(
				'id, eventType, severity, userId, email, ipAddress, userAgent, resource, action, details, timestamp'
			)
			.gte('timestamp', start.toISOString())
			.order('timestamp', { ascending: false })
			.limit(500)

		if (error) {
			this.logger.error('Failed to fetch security audit logs', { error })
			return this.getEmptyMetrics(start, end)
		}

		const auditLogs = (data ?? []) as SecurityAuditLogEntry[]

		const eventsByType = this.initializeTypeBuckets()
		const eventsBySeverity = this.initializeSeverityBuckets()
		const ipCounts = new Map<string, number>()

		for (const log of auditLogs) {
			const typeKey = log.eventType as SecurityEventTypeEnum
			const severityKey = log.severity as SecurityEventSeverityEnum

			if (eventsByType[typeKey] === undefined) {
				eventsByType[typeKey] = 0
			}
			eventsByType[typeKey] += 1

			if (eventsBySeverity[severityKey] === undefined) {
				eventsBySeverity[severityKey] = 0
			}
			eventsBySeverity[severityKey] += 1

			if (log.ipAddress) {
				ipCounts.set(log.ipAddress, (ipCounts.get(log.ipAddress) ?? 0) + 1)
			}
		}

		const recentEvents = this.buildRecentEvents(auditLogs)
		const recentTrends = this.buildRecentTrends(auditLogs)
		const topThreateningIPs = this.buildThreateningIPs(ipCounts)
		const suspiciousIPs = topThreateningIPs.map(item => item.ip)

		const failedAuthAttempts =
			eventsByType[SecurityEventTypeEnum.AUTH_FAILURE] ?? 0
		const blockedRequests =
			(eventsByType[SecurityEventTypeEnum.RATE_LIMIT_EXCEEDED] ?? 0) +
			(eventsByType[SecurityEventTypeEnum.FILE_UPLOAD_BLOCKED] ?? 0) +
			(eventsByType[SecurityEventTypeEnum.CSRF_ATTEMPT] ?? 0) +
			(eventsByType[SecurityEventTypeEnum.XSS_ATTEMPT] ?? 0)

		return {
			totalEvents: auditLogs.length,
			eventsByType,
			eventsBySeverity,
			criticalEvents: eventsBySeverity[SecurityEventSeverityEnum.CRITICAL] ?? 0,
			recentEvents,
			recentTrends,
			topThreateningIPs,
			suspiciousIPs,
			failedAuthAttempts,
			blockedRequests,
			timeRange: {
				start,
				end
			}
		}
	}

	private getEmptyMetrics(start: Date, end: Date): SecurityMetrics {
		return {
			totalEvents: 0,
			eventsByType: this.initializeTypeBuckets(),
			eventsBySeverity: this.initializeSeverityBuckets(),
			criticalEvents: 0,
			recentEvents: [],
			recentTrends: [],
			topThreateningIPs: [],
			suspiciousIPs: [],
			failedAuthAttempts: 0,
			blockedRequests: 0,
			timeRange: { start, end }
		}
	}

	private initializeTypeBuckets(): Record<SecurityEventTypeEnum, number> {
		return Object.values(SecurityEventTypeEnum).reduce(
			(acc, type) => {
				acc[type] = 0
				return acc
			},
			{} as Record<SecurityEventTypeEnum, number>
		)
	}

	private initializeSeverityBuckets(): Record<
		SecurityEventSeverityEnum,
		number
	> {
		return Object.values(SecurityEventSeverityEnum).reduce(
			(acc, severity) => {
				acc[severity] = 0
				return acc
			},
			{} as Record<SecurityEventSeverityEnum, number>
		)
	}

	private buildRecentEvents(logs: SecurityAuditLogEntry[]): SecurityEvent[] {
		return logs.slice(0, RECENT_EVENTS_LIMIT).map(log => {
			const event: SecurityEvent = {
				type: log.eventType,
				severity: log.severity
			}

			// Only assign optional properties if they have values (exactOptionalPropertyTypes)
			if (log.userId !== null && log.userId !== undefined) {
				event.userId = log.userId
			}
			if (log.details !== null && log.details !== undefined) {
				event.details =
					typeof log.details === 'string'
						? log.details
						: JSON.stringify(log.details)
			}
			if (log.ipAddress !== null && log.ipAddress !== undefined) {
				event.ipAddress = log.ipAddress
			}
			if (log.userAgent !== null && log.userAgent !== undefined) {
				event.userAgent = log.userAgent
			}
			if (log.timestamp) {
				event.timestamp = new Date(log.timestamp)
			}

			return event
		})
	}

	private buildRecentTrends(
		logs: SecurityAuditLogEntry[]
	): SecurityTrendPoint[] {
		const trendByDate = new Map<string, SecurityTrendPoint>()

		for (const log of logs) {
			const dateKey = new Date(log.timestamp).toISOString().slice(0, 10)
			const current = trendByDate.get(dateKey) ?? {
				date: dateKey,
				totalEvents: 0,
				criticalEvents: 0
			}

			current.totalEvents += 1
			if (log.severity === SecurityEventSeverityEnum.CRITICAL) {
				current.criticalEvents += 1
			}

			trendByDate.set(dateKey, current)
		}

		return Array.from(trendByDate.values())
			.sort((a, b) => a.date.localeCompare(b.date))
			.slice(-TREND_WINDOW_DAYS)
	}

	private buildThreateningIPs(
		ipCounts: Map<string, number>
	): SecurityThreatSummary[] {
		return Array.from(ipCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([ip, count]) => ({ ip, count }))
	}
}
