/**
 * Queue names constants
 * Separated to avoid circular dependencies between processors and module
 */
export const QUEUE_NAMES = {
	EMAILS: 'email',
	PAYMENTS: 'payments',
	MAINTENANCE: 'maintenance',
	NOTIFICATIONS: 'notifications',
	REPORTS: 'reports',
	WEBHOOKS: 'webhooks'
} as const

// Legacy alias for backwards compatibility
export const FUTURE_QUEUE_NAMES = {
	MAINTENANCE: 'maintenance',
	NOTIFICATIONS: 'notifications',
	REPORTS: 'reports',
	WEBHOOKS: 'webhooks'
} as const

export type QueueName = keyof typeof QUEUE_NAMES
export type QueueNameValue = (typeof QUEUE_NAMES)[QueueName]
