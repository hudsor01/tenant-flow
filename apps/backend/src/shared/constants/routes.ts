export const HEALTH_PATHS = [
	'health',
	'health/ready',
	'health/ping',
	'health/stripe-sync',
	'health/performance',
	'health/circuit-breaker',
	'auth',
	'auth/ready',
	'webhooks/health',
	'webhooks/health/summary'
	// NOTE: /configuration and /failures require authentication
	// They are protected by JwtAuthGuard (no @Public() decorator)
] as const

export type HealthPath = (typeof HEALTH_PATHS)[number]

export const WEBHOOK_PATHS = [
	'webhooks/stripe',
	'webhooks/stripe-sync',
	'webhooks/auth/user-confirmed'
] as const

export type WebhookPath = (typeof WEBHOOK_PATHS)[number]
