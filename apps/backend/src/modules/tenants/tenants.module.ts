import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'

/**
 * Tenants module - Ultra-Native NestJS Implementation
 * Controller → Service → Supabase
 * TenantsService uses direct Supabase queries for data access
 */
@Module({
	imports: [SupabaseModule],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
