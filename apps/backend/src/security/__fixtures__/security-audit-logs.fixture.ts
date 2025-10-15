import {
	SecurityEventSeverity,
	SecurityEventType
} from '@repo/shared/types/security'
import type { SecurityAuditLogEntry } from '@repo/shared/types/security-repository'

export const securityAuditLogFixture: SecurityAuditLogEntry[] = [
	{
		id: 'log-1',
		eventType: SecurityEventType.AUTH_FAILURE,
		severity: SecurityEventSeverity.MEDIUM,
		userId: 'user-1',
		email: 'user1@example.com',
		ipAddress: '192.0.2.1',
		userAgent: 'Mozilla/5.0',
		resource: 'auth',
		action: 'login',
		details: { reason: 'Invalid password' },
		timestamp: new Date().toISOString()
	},
	{
		id: 'log-2',
		eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
		severity: SecurityEventSeverity.HIGH,
		userId: 'user-2',
		email: 'user2@example.com',
		ipAddress: '192.0.2.1',
		userAgent: 'Mozilla/5.0',
		resource: 'api',
		action: 'graphql-query',
		details: { threshold: '5 requests / minute' },
		timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
	},
	{
		id: 'log-3',
		eventType: SecurityEventType.XSS_ATTEMPT,
		severity: SecurityEventSeverity.CRITICAL,
		userId: null,
		email: null,
		ipAddress: '198.51.100.5',
		userAgent: 'OWASP ZAP',
		resource: 'web-form',
		action: 'input-validation',
		details: { payload: '<script>alert(1)</script>' },
		timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString()
	}
]
