import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SharedModule } from '../../shared/shared.module'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { CacheConfigurationModule } from '../../cache/cache.module'

@Module({
	imports: [SupabaseModule, SharedModule, CacheConfigurationModule],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService] // Export for use by other modules (leases, maintenance, etc.)
})
export class UnitsModule {}
