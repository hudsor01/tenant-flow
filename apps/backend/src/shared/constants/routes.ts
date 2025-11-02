export const HEALTH_PATHS = [
	'health',
	'api/v1/health',
	'webhooks/health',
	'webhooks/health/summary',
	'webhooks/health/configuration',
	'webhooks/health/failures'
] as const

export type HealthPath = (typeof HEALTH_PATHS)[number]
