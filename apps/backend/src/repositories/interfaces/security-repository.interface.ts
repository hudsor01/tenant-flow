import type {
	SecurityEventSeverity,
	SecurityEventType
} from '@repo/shared/types/security'

export interface SecurityAuditLogEntry {
	id: string
	eventType: SecurityEventType
	severity: SecurityEventSeverity
	userId: string | null
	email: string | null
	ipAddress: string | null
	userAgent: string | null
	resource: string | null
	action: string | null
	details: Record<string, unknown> | null
	timestamp: string
}

export interface SecurityAuditQueryOptions {
	from?: Date
	to?: Date
	limit?: number
	severity?: SecurityEventSeverity
	eventType?: SecurityEventType
}

export interface ISecurityRepository {
	fetchAuditLogs(options?: SecurityAuditQueryOptions): Promise<SecurityAuditLogEntry[]>
}
