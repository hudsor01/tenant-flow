import { Module, Global } from '@nestjs/common'
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { ZeroCacheService } from './cache.service'
import {
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN,
	type CacheModuleOptions
} from './cache.module-definition'

@Global()
@Module({
	imports: [
		NestCacheModule.registerAsync({
			useFactory: (options: CacheModuleOptions) => ({
				isGlobal: options.isGlobal ?? true,
				ttl: options.ttl,
				max: options.max
			}),
			inject: [MODULE_OPTIONS_TOKEN]
		})
	],
	providers: [ZeroCacheService],
	exports: [ZeroCacheService, NestCacheModule]
})
export class CacheConfigurationModule extends ConfigurableModuleClass {}
