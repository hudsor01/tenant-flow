// rate-limiting/rate-limiting.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common'
import type { ThrottlerModuleOptions } from '@nestjs/throttler'

// Use type alias instead of interface extension to avoid type conflicts
export type RateLimitingModuleOptions = ThrottlerModuleOptions

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<RateLimitingModuleOptions>()
		.setClassMethodName('forRoot')
		.build()
