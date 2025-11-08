import { Module, Global } from '@nestjs/common'
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { ZeroCacheService } from './cache.service'
import {
	ConfigurableModuleClass,
	type CacheModuleOptions
} from './cache.module-definition'

@Global()
@Module({
	providers: [ZeroCacheService],
	exports: [ZeroCacheService, NestCacheModule]
})
export class CacheConfigurationModule extends ConfigurableModuleClass {
	static override forRoot(options: CacheModuleOptions) {
		return {
			global: true,
			module: CacheConfigurationModule,
			imports: [
				NestCacheModule.register({
					isGlobal: options.isGlobal ?? true,
					ttl: options.ttl,
					max: options.max
				})
			],
			providers: [ZeroCacheService],
			exports: [ZeroCacheService, NestCacheModule]
		}
	}
}
