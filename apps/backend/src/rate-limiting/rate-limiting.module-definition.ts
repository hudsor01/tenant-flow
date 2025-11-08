// rate-limiting/rate-limiting.module-definition.ts
import { ConfigurableModuleBuilder } from '@nestjs/common'
import type { ThrottlerModuleOptions } from '@nestjs/throttler'

export interface RateLimitingModuleOptions extends ThrottlerModuleOptions {
	// Extend or customize as needed
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<RateLimitingModuleOptions>()
		.setClassMethodName('forRoot')
		.build()
