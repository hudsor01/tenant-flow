import {
	SecurityEventType
} from '@repo/shared/types/security'

export const securityAuditLogFixture = [
	{
		id: 'log-1',
		event_type: SecurityEventType.AUTH_FAILURE,
		user_id: 'user-1',
		details: { reason: 'Invalid password' },
		created_at: new Date().toISOString()
	},
	{
		id: 'log-2',
		event_type: SecurityEventType.RATE_LIMIT_EXCEEDED,
		user_id: 'user-2',
		details: { threshold: '5 requests / minute' },
		created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
	},
	{
		id: 'log-3',
		event_type: SecurityEventType.XSS_ATTEMPT,
		user_id: null,
		details: { payload: '<script>alert(1)</script>' },
		created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
	}
]
