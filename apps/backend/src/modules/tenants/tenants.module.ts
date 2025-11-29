import { Module, Logger } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { TenantsController } from './tenants.controller'

// Specialized sub-services
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantPaymentService } from './tenant-payment.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'

/**
 * Tenants Module - Refactored with Specialized Services
 *
 * Architecture:
 * TenantsService (Facade) → Delegates to specialized services
 * ├─ TenantQueryService (Read operations)
 * ├─ TenantCrudService (Create, Update, Delete)
 * ├─ TenantEmergencyContactService (Contact management)
 * ├─ TenantNotificationPreferencesService (Settings)
 * ├─ TenantPaymentService (Payment queries and analytics)
 * ├─ TenantInvitationTokenService (Token validation/acceptance)
 * └─ TenantPlatformInvitationService (Platform invitation, lease is separate workflow)
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
	controllers: [TenantsController],
	providers: [
		Logger,
		TenantQueryService,
		TenantCrudService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantInvitationTokenService,
		TenantPlatformInvitationService
	],
	exports: [
		TenantQueryService,
		TenantCrudService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantInvitationTokenService,
		TenantPlatformInvitationService
	]
})
export class TenantsModule {}
