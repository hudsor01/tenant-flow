import { Inject, Injectable } from '@nestjs/common'
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
import type {
	ISecurityRepository,
	SecurityAuditLogEntry
} from '../repositories/interfaces/security-repository.interface'
import { REPOSITORY_TOKENS } from '../repositories/repositories.module'

const DEFAULT_LOOKBACK_DAYS = 30
const RECENT_EVENTS_LIMIT = 25
const TREND_WINDOW_DAYS = 14

@Injectable()
export class SecurityMetricsService {
	constructor(
		@Inject(REPOSITORY_TOKENS.SECURITY)
		private readonly securityRepository: ISecurityRepository
	) {}

	async getMetrics(
		lookbackInDays: number = DEFAULT_LOOKBACK_DAYS
	): Promise<SecurityMetrics> {
		const end = new Date()
		const start = new Date(end.getTime() - lookbackInDays * 24 * 60 * 60 * 1000)

		const auditLogs = await this.securityRepository.fetchAuditLogs({
			from: start,
			limit: 500
		})

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
		return logs.slice(0, RECENT_EVENTS_LIMIT).map(log => ({
			type: log.eventType,
			severity: log.severity,
			userId: log.userId ?? undefined,
			details:
				typeof log.details === 'string'
					? log.details
					: log.details
						? JSON.stringify(log.details)
						: undefined,
			metadata: undefined,
			ipAddress: log.ipAddress ?? undefined,
			userAgent: log.userAgent ?? undefined,
			timestamp: log.timestamp ? new Date(log.timestamp) : undefined
		}))
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
