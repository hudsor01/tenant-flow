// rate-limiting/rate-limiting.module.ts
import { Module } from '@nestjs/common'
import { ThrottlerModule } from '@nestjs/throttler'
import {
	ConfigurableModuleClass,
	type RateLimitingModuleOptions
} from './rate-limiting.module-definition'

@Module({})
export class RateLimitingModule extends ConfigurableModuleClass {
	static override forRoot(options: RateLimitingModuleOptions) {
		return {
			module: RateLimitingModule,
			imports: [ThrottlerModule.forRoot(options)],
			exports: [ThrottlerModule]
		}
	}
}
