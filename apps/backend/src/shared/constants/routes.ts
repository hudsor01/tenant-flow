export const HEALTH_PATHS = [
  'health',
  'health/ping',
  'health/ready',
  'health/debug'
] as const

export type HealthPath = typeof HEALTH_PATHS[number]

