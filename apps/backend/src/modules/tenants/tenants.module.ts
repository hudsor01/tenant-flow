import { Module, Logger } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { TenantsController } from './tenants.controller'

// Query services (decomposed from TenantQueryService)
import { TenantDetailService } from './tenant-detail.service'
import { TenantListService } from './tenant-list.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationService } from './tenant-relation.service'
import { TenantInvitationQueryService } from './tenant-invitation-query.service'

// Coordinator and other specialized services
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantPaymentService } from './tenant-payment.service'
import { TenantInvitationService } from './tenant-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { TenantResendInvitationService } from './tenant-resend-invitation.service'

/**
 * Tenants Module - Refactored with Decomposed Query Services
 *
 * Architecture:
 * TenantQueryService (Facade) → Delegates to specialized query services
 * ├─ TenantDetailService (findOne, findOneWithLease, getTenantByAuthUserId)
 * ├─ TenantListService (findAll, findAllWithLeaseInfo)
 * ├─ TenantStatsService (getStats, getSummary, fetchPaymentStatuses)
 * ├─ TenantRelationService (getOwnerPropertyIds, getTenantIdsForOwner, payments)
 * └─ TenantInvitationQueryService (getInvitations, computeInvitationStatus)
 *
 * Other Services:
 * ├─ TenantCrudService (Create, Update, Delete)
 * ├─ TenantEmergencyContactService (Contact management)
 * ├─ TenantNotificationPreferencesService (Settings)
 * ├─ TenantPaymentService (Payment queries and analytics)
 * ├─ TenantInvitationService (Invitation SAGA)
 * ├─ TenantInvitationTokenService (Token validation)
 * └─ TenantResendInvitationService (Resend logic)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service (<150 lines each)
 * - Independent development
 * - Clear dependency graph
 */
@Module({
	imports: [SupabaseModule, EmailModule, StripeModule],
	controllers: [TenantsController],
	providers: [
		Logger,
		// Query services (decomposed)
		TenantDetailService,
		TenantListService,
		TenantStatsService,
		TenantRelationService,
		TenantInvitationQueryService,
		// Coordinator service (facade)
		TenantQueryService,
		// Other services
		TenantCrudService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantInvitationService,
		TenantInvitationTokenService,
		TenantResendInvitationService
	],
	exports: [
		// Export query services for direct use if needed
		TenantDetailService,
		TenantListService,
		TenantStatsService,
		TenantRelationService,
		TenantInvitationQueryService,
		// Export coordinator service (main entry point)
		TenantQueryService,
		// Export other services
		TenantCrudService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantInvitationService,
		TenantInvitationTokenService,
		TenantResendInvitationService
	]
})
export class TenantsModule {}
