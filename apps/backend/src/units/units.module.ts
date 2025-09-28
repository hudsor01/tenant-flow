import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { SupabaseModule } from '../database/supabase.module'
import { SharedModule } from '../shared/shared.module'
import { RepositoriesModule } from '../repositories/repositories.module'

@Module({
	imports: [SupabaseModule, RepositoriesModule, SharedModule],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService] // Export for use by other modules (leases, maintenance, etc.)
})
export class UnitsModule {}
