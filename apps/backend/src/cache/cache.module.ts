import { Module, Global, Logger } from '@nestjs/common'
import { ZeroCacheService } from './cache.service'

@Global()
@Module({
	providers: [ZeroCacheService, Logger],
	exports: [ZeroCacheService]
})
export class CacheModule {}