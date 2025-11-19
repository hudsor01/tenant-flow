import { Module, Logger } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { AuthWebhookController } from './auth-webhook.controller'
import { TenantsController } from './tenants.controller'

// Main facade service
import { TenantsService } from './tenants.service'

// Specialized sub-services
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantAnalyticsService } from './tenant-analytics.service'
import { TenantInvitationService } from './tenant-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { TenantResendInvitationService } from './tenant-resend-invitation.service'
import { TenantListService } from './tenant-list.service'
import { TenantDetailService } from './tenant-detail.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationsService } from './tenant-relations.service'

/**
 * Tenants Module - Refactored with 8 Specialized Services
 *
 * Architecture:
 * TenantsService (Facade) → Delegates to specialized services
 * ├─ TenantQueryService (Read operations)
 * ├─ TenantCrudService (Create, Update, Delete)
 * ├─ TenantEmergencyContactService (Contact management)
 * ├─ TenantNotificationPreferencesService (Settings)
 * ├─ TenantAnalyticsService (Payment analytics)
 * ├─ TenantInvitationService (Invitation SAGA)
 * ├─ TenantInvitationTokenService (Token validation)
 * └─ TenantResendInvitationService (Resend logic)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service
 * - Independent development
 * - Clear dependency graph
 */
@Module({
	imports: [SupabaseModule, EmailModule, StripeModule],
	controllers: [TenantsController, AuthWebhookController],
	providers: [
		Logger,
		
		// Specialized query services
		TenantListService,
		TenantDetailService,
		TenantStatsService,
		TenantRelationsService,
		
		// Main query service (coordinator)
		TenantQueryService,
		
		// Core services
		TenantCrudService,
		
		// Feature services
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantAnalyticsService,
		
		// Invitation flow services
		TenantInvitationService,
		TenantInvitationTokenService,
		TenantResendInvitationService,
		
		// Facade service (backward compatibility)
		TenantsService
	],
	exports: [
		TenantsService,
		TenantQueryService,
		TenantCrudService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantAnalyticsService,
		TenantInvitationService,
		TenantInvitationTokenService,
		TenantResendInvitationService
	]
})
export class TenantsModule {}
