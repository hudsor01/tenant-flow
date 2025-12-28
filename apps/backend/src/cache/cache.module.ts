import { Module, Global } from '@nestjs/common'
import { RedisCacheService } from './cache.service'
import {
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN
} from './cache.module-definition'

@Global()
@Module({
	providers: [
		RedisCacheService,
		{
			provide: MODULE_OPTIONS_TOKEN,
			useValue: {
				ttlShortMs: 30_000,
				ttlMediumMs: 5 * 60 * 1000,
				ttlLongMs: 30 * 60 * 1000,
				keyPrefix: 'cache',
				isGlobal: true
			}
		}
	],
	exports: [RedisCacheService]
})
export class CacheConfigurationModule extends ConfigurableModuleClass {}
