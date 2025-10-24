import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'

/**
 * Tenants module - Ultra-Native NestJS Implementation
 * Controller → Service → Supabase + Email
 * TenantsService uses direct Supabase queries for data access and direct Resend for emails
 */
@Module({
	imports: [SupabaseModule, EmailModule],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService]
})
export class TenantsModule {}
