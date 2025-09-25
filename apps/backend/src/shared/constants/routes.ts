export const HEALTH_PATHS = ['health', 'api/v1/health'] as const

export type HealthPath = (typeof HEALTH_PATHS)[number]
