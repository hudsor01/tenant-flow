import { ConfigurableModuleBuilder } from '@nestjs/common'
import type { ClsModuleOptions } from 'nestjs-cls'

export type ContextModuleOptions = ClsModuleOptions

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
	new ConfigurableModuleBuilder<ContextModuleOptions>()
		.setClassMethodName('forRoot')
		.build()
