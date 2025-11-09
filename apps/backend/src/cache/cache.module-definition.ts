import { ConfigurableModuleBuilder } from '@nestjs/common'

export interface CacheModuleOptions {
	ttl: number
	max: number
	isGlobal?: boolean
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<CacheModuleOptions>()
		.setClassMethodName('forRoot')
		.build()
