import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { AuthWebhookController } from './auth-webhook.controller'
import { TenantsController } from './tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantInvitationService } from './tenant-invitation.service'

/**
 * Tenants module - Ultra-Native NestJS Implementation
 * Controller → Service → Supabase + Email
 * TenantsService uses direct Supabase queries for data access and direct Resend for emails
 */
@Module({
	imports: [SupabaseModule, EmailModule, StripeModule],
	controllers: [TenantsController, AuthWebhookController],
	providers: [TenantsService, TenantInvitationService],
	exports: [TenantsService]
})
export class TenantsModule {}
