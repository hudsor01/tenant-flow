export const HEALTH_PATHS = [
	'health',
	'api/v1/health',
	'webhooks/health',
	'webhooks/health/summary'
	// NOTE: /configuration and /failures require authentication
	// They are protected by JwtAuthGuard (no @Public() decorator)
] as const

export type HealthPath = (typeof HEALTH_PATHS)[number]
