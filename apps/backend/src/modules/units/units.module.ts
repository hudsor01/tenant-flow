import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitStatsService } from './services/unit-stats.service'
import { UnitQueryService } from './services/unit-query.service'
import { CacheConfigurationModule } from '../../cache/cache.module'

@Module({
	imports: [SupabaseModule, SharedModule, CacheConfigurationModule],
	controllers: [UnitsController],
	providers: [UnitsService, UnitStatsService, UnitQueryService],
	exports: [UnitsService, UnitStatsService, UnitQueryService]
})
export class UnitsModule {}
