import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { UnitAnalyticsService } from './services/unit-analytics.service'
import { UnitRelationService } from './services/unit-relation.service'
import { CacheConfigurationModule } from '../../cache/cache.module'

@Module({
	imports: [SupabaseModule, SharedModule, CacheConfigurationModule],
	controllers: [UnitsController],
	providers: [UnitsService, UnitAnalyticsService, UnitRelationService],
	exports: [UnitsService, UnitAnalyticsService, UnitRelationService] // Export for use by other modules (leases, maintenance, etc.)
})
export class UnitsModule {}
