import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'

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
