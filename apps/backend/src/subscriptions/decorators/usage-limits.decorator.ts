import { SetMetadata } from '@nestjs/common'

export const USAGE_LIMIT_KEY = 'usage_limit'

export interface UsageLimitConfig {
  resource: 'properties' | 'units' | 'storage'
  action: 'create' | 'upload' | 'import'
  message?: string
}

/**
 * Decorator to enforce usage limits for endpoints
 * Usage: @UsageLimit({ resource: 'properties', action: 'create' })
 */
export const UsageLimit = (config: UsageLimitConfig) => SetMetadata(USAGE_LIMIT_KEY, config)