import { Module, Global } from '@nestjs/common'
import { ZeroCacheService } from './cache.service'

@Global()
@Module({
	providers: [ZeroCacheService],
	exports: [ZeroCacheService]
})
export class CacheModule {}