import { ConfigurableModuleBuilder } from '@nestjs/common'

export interface CacheModuleOptions {
	ttlShortMs?: number
	ttlMediumMs?: number
	ttlLongMs?: number
	keyPrefix?: string
	isGlobal?: boolean
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<CacheModuleOptions>()
		.setClassMethodName('forRoot')
		.build()
