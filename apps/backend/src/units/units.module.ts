import { Module } from '@nestjs/common'
import { UnitsController } from './units.controller'
import { UnitsService } from './units.service'
import { SupabaseModule } from '../database/supabase.module'
import { AuthModule } from '../auth/auth.module'

@Module({
	imports: [SupabaseModule, AuthModule],
	controllers: [UnitsController],
	providers: [UnitsService],
	exports: [UnitsService] // Export for use by other modules (leases, maintenance, etc.)
})
export class UnitsModule {}
