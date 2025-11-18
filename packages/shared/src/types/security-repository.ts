import type {
  SecurityEventSeverity,
  SecurityEventType
} from './security.js'

export interface SecurityAuditLogEntry {
  id: string
  eventType: SecurityEventType
  severity: SecurityEventSeverity
  user_id: string | null
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

export interface SecurityRepositoryContract {
  fetchAuditLogs(options?: SecurityAuditQueryOptions): Promise<SecurityAuditLogEntry[]>
}
