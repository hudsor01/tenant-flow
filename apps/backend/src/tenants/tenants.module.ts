import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { SupabaseModule } from '../database/supabase.module'

/**
 * Tenants module - Simplified with direct Supabase usage
 */
@Module({
	imports: [SupabaseModule],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
