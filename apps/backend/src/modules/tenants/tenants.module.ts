import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { StripeModule } from '../billing/stripe.module'
import { SseModule } from '../notifications/sse/sse.module'

// Controllers (decomposed for CLAUDE.md compliance)
import { TenantsController } from './tenants.controller'
import { TenantInvitationController } from './tenant-invitation.controller'
import { TenantEmergencyContactController } from './tenant-emergency-contact.controller'
import { TenantPaymentController } from './tenant-payment.controller'

// Query services (decomposed from TenantQueryService)
import { TenantDetailService } from './tenant-detail.service'
import { TenantListService } from './tenant-list.service'
import { TenantLeaseQueryService } from './tenant-lease-query.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationService } from './tenant-relation.service'
import { TenantInvitationQueryService } from './tenant-invitation-query.service'

// Coordinator and other specialized services
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantBulkOperationsService } from './tenant-bulk-operations.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantPaymentService } from './tenant-payment.service'
import { TenantPaymentQueryService } from './tenant-payment-query.service'
import { TenantPaymentMapperService } from './tenant-payment-mapper.service'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'

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
 * ├─ TenantPlatformInvitationService (Invitation SAGA)
 * └─ TenantInvitationTokenService (Token validation)
 *
 * Benefits:
 * - Single Responsibility Principle
 * - Easy to test in isolation
 * - Low cognitive complexity per service (<150 lines each)
 * - Independent development
 * - Clear dependency graph
 */
@Module({
	imports: [SupabaseModule, EmailModule, StripeModule, SseModule],
	controllers: [
		TenantsController,
		TenantInvitationController,
		TenantEmergencyContactController,
		TenantPaymentController
	],
	providers: [
		// Query services (decomposed)
		TenantDetailService,
		TenantListService,
		TenantLeaseQueryService,
		TenantStatsService,
		TenantRelationService,
		TenantInvitationQueryService,
		// Coordinator service (facade)
		TenantQueryService,
		// Other services
		TenantCrudService,
		TenantBulkOperationsService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantPaymentQueryService,
		TenantPaymentMapperService,
		TenantPlatformInvitationService,
		TenantInvitationTokenService
	],
	exports: [
		// Export query services for direct use if needed
		TenantDetailService,
		TenantListService,
		TenantLeaseQueryService,
		TenantStatsService,
		TenantRelationService,
		TenantInvitationQueryService,
		// Export coordinator service (main entry point)
		TenantQueryService,
		// Export other services
		TenantCrudService,
		TenantBulkOperationsService,
		TenantEmergencyContactService,
		TenantNotificationPreferencesService,
		TenantPaymentService,
		TenantPaymentQueryService,
		TenantPaymentMapperService,
		TenantPlatformInvitationService,
		TenantInvitationTokenService
	]
})
export class TenantsModule {}
