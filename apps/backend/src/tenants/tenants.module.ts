import { Module, Logger } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { SupabaseModule } from '../database/supabase.module'
import { SharedModule } from '../shared/shared.module'

/**
 * Tenants module - Simplified with direct Supabase usage
 */
@Module({
	imports: [SupabaseModule, SharedModule],
	controllers: [TenantsController],
	providers: [TenantsService, Logger],
	exports: [TenantsService]
})
export class TenantsModule {}
