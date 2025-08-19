import { SetMetadata } from '@nestjs/common'

export const USAGE_LIMITS_KEY = 'usageLimits'

export interface UsageLimitOptions {
	feature: string
	limit?: number
}

export const UsageLimit = (options: UsageLimitOptions) =>
	SetMetadata(USAGE_LIMITS_KEY, options)
