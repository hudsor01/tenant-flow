import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { SupabaseModule } from '../database/supabase.module'
import { SharedModule } from '../shared/shared.module'

@Module({
	imports: [SupabaseModule, SharedModule],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService] // Export for use by other modules (leases, maintenance, etc.)
})
export class UnitsModule {}
