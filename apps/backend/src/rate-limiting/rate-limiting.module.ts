// rate-limiting/rate-limiting.module.ts
import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import {
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN,
	type RateLimitingModuleOptions
} from './rate-limiting.module-definition'

@Module({
	imports: [
		ThrottlerModule.forRootAsync({
			useFactory: (options: RateLimitingModuleOptions) => options,
			inject: [MODULE_OPTIONS_TOKEN]
		})
	],
	exports: [ThrottlerModule]
})
export class RateLimitingModule extends ConfigurableModuleClass {}
