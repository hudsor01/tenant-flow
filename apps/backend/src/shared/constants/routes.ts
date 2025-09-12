export const HEALTH_PATHS = ['health'] as const

export type HealthPath = typeof HEALTH_PATHS[number]
