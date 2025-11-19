/**
 * Tenants Service - Facade Pattern
 *
 * Main service that delegates to specialized sub-services
 * Each sub-service handles a specific domain:
 * - TenantListService, TenantDetailService, TenantStatsService, TenantRelationsService: Read operations
 * - TenantCrudService: Create, Update, Delete
 * - TenantEmergencyContactService: Emergency contact management
 * - TenantNotificationPreferencesService: Notification settings
 * - TenantAnalyticsService: Payment analytics & reporting
 * - TenantInvitationService: Invitation SAGA orchestration
 * - TenantInvitationTokenService: Token validation
 * - TenantResendInvitationService: Resend invitation logic
 */

import { Injectable } from '@nestjs/common'

// Import specialized query services
import { TenantListService, type ListFilters } from './tenant-list.service'
import { TenantDetailService } from './tenant-detail.service'
import { TenantStatsService } from './tenant-stats.service'
import { TenantRelationsService } from './tenant-relations.service'

// Import other services
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantAnalyticsService } from './tenant-analytics.service'
import { TenantInvitationService } from './tenant-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { TenantResendInvitationService } from './tenant-resend-invitation.service'

// Import types from shared layer
import type {
	CreateTenantRequest,
	UpdateTenantRequest,
	InviteTenantDto,
	SendPaymentReminderResponse,
	OwnerPaymentSummaryResponse,
	TenantPaymentRecord
} from '@repo/shared/types/api-contracts'
import { CreateEmergencyContactDto, UpdateEmergencyContactDto } from './dto/emergency-contact.dto'
import type {
	Tenant,
	TenantStats,
	TenantSummary,
	TenantWithLeaseInfo,
	RentPayment,
	TenantNotificationPreferences
} from '@repo/shared/types/core'
import type { EmergencyContactResponse } from './tenant-emergency-contact.service'

/**
 * Facade service - delegates to specialized sub-services
 * Modern API with no backward compatibility cruft
 */
@Injectable()
export class TenantsService {
	constructor(
		// Query services
		private readonly list: TenantListService,
		private readonly detail: TenantDetailService,
		private readonly stats: TenantStatsService,
		private readonly relations: TenantRelationsService,
		// CRUD service
		private readonly crudService: TenantCrudService,
		// Feature services
		private readonly emergencyContactService: TenantEmergencyContactService,
		private readonly notificationPreferencesService: TenantNotificationPreferencesService,
		private readonly analyticsService: TenantAnalyticsService,
		// Invitation services
		private readonly invitationService: TenantInvitationService,
		private readonly invitationTokenService: TenantInvitationTokenService,
		private readonly resendInvitationService: TenantResendInvitationService
	) {}

	// ============================================================================
	// LIST QUERIES
	// ============================================================================

	async findAll(userId: string, filters?: ListFilters): Promise<Tenant[]> {
		return this.list.findAll(userId, filters)
	}

	async findAllWithLeaseInfo(userId: string, filters?: Omit<ListFilters, 'status'>): Promise<TenantWithLeaseInfo[]> {
		return this.list.findAllWithActiveLease(userId, filters)
	}

	// ============================================================================
	// DETAIL QUERIES
	// ============================================================================

	async findOne(tenantId: string): Promise<Tenant> {
		return this.detail.findById(tenantId)
	}

	async findOneWithLease(tenantId: string): Promise<TenantWithLeaseInfo> {
		return this.detail.findByIdWithLeases(tenantId)
	}

	async getTenantByAuthUserId(authUserId: string): Promise<Tenant> {
		return this.detail.findByAuthUserId(authUserId)
	}

	// ============================================================================
	// STATISTICS
	// ============================================================================

	async getStats(userId: string): Promise<TenantStats> {
		return this.stats.getStatusCounts(userId)
	}

	async getSummary(userId: string): Promise<TenantSummary> {
		return this.stats.getSummary(userId)
	}

	// ============================================================================
	// RELATIONS & JOINS
	// ============================================================================

	async getOwnerPropertyIds(ownerId: string): Promise<string[]> {
		return this.relations.getOwnerPropertyIds(ownerId)
	}

	async getTenantIdsForOwner(ownerId: string): Promise<string[]> {
		return this.relations.getTenantIdsForOwner(ownerId)
	}

	async getTenantPaymentHistory(tenantId: string, limit?: number): Promise<RentPayment[]> {
		return this.relations.getPaymentHistory(tenantId, limit)
	}

	async batchFetchPaymentStatuses(tenantIds: string[]): Promise<Map<string, RentPayment>> {
		return this.relations.fetchPaymentStatuses(tenantIds)
	}

	// ============================================================================
	// CRUD OPERATIONS
	// ============================================================================

	async create(userId: string, createRequest: CreateTenantRequest): Promise<Tenant> {
		return this.crudService.create(userId, createRequest)
	}

	async update(
		userId: string,
		tenantId: string,
		updateRequest: UpdateTenantRequest,

		_expectedVersion?: number
	): Promise<Tenant> {
		return this.crudService.update(userId, tenantId, updateRequest)
	}

	async markAsMovedOut(
		userId: string,
		tenantId: string,
		moveOutDate: string,
		moveOutReason: string
	): Promise<Tenant> {
		return this.crudService.markAsMovedOut(userId, tenantId, moveOutDate, moveOutReason)
	}

	async remove(userId: string, tenantId: string): Promise<Tenant> {
		return this.crudService.softDelete(userId, tenantId)
	}

	async hardDelete(userId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
		return this.crudService.hardDelete(userId, tenantId)
	}

	// ============================================================================
	// EMERGENCY CONTACT MANAGEMENT
	// ============================================================================

	async getEmergencyContact(userId: string, tenantId: string): Promise<EmergencyContactResponse | null> {
		return this.emergencyContactService.getEmergencyContact(userId, tenantId)
	}

	async createEmergencyContact(
		userId: string,
		tenantId: string,
		dto: CreateEmergencyContactDto
	): Promise<EmergencyContactResponse> {
		const serviceDto = {
			contact_name: dto.contactName,
			relationship: dto.relationship,
			phone_number: dto.phoneNumber,
			email: dto.email ?? null
		}
		return this.emergencyContactService.createEmergencyContact(userId, tenantId, serviceDto)
	}

	async updateEmergencyContact(
		userId: string,
		tenantId: string,
		dto: UpdateEmergencyContactDto
	): Promise<EmergencyContactResponse> {
		const serviceDto: {
			contact_name?: string
			relationship?: string
			phone_number?: string
			email?: string | null
		} = {}
		if (dto.contactName !== undefined) serviceDto.contact_name = dto.contactName
		if (dto.relationship !== undefined) serviceDto.relationship = dto.relationship
		if (dto.phoneNumber !== undefined) serviceDto.phone_number = dto.phoneNumber
		if (dto.email !== undefined) serviceDto.email = dto.email
		return this.emergencyContactService.updateEmergencyContact(userId, tenantId, serviceDto)
	}

	async deleteEmergencyContact(userId: string, tenantId: string): Promise<{ success: boolean }> {
		return this.emergencyContactService.deleteEmergencyContact(userId, tenantId)
	}

	// ============================================================================
	// NOTIFICATION PREFERENCES
	// ============================================================================

	async getNotificationPreferences(
		userId: string,
		tenantId: string
	): Promise<TenantNotificationPreferences | null> {
		return this.notificationPreferencesService.getPreferences(userId, tenantId)
	}

	async updateNotificationPreferences(
		userId: string,
		tenantId: string,
		preferences: Partial<TenantNotificationPreferences>
	): Promise<TenantNotificationPreferences | null> {
		return this.notificationPreferencesService.updatePreferences(userId, tenantId, preferences)
	}

	// ============================================================================
	// ANALYTICS & PAYMENTS
	// ============================================================================

	async calculatePaymentStatus(tenantId: string): Promise<Record<string, unknown> | null> {
		return this.analyticsService.calculatePaymentStatus(tenantId)
	}

	async getOwnerPaymentSummary(ownerId: string): Promise<OwnerPaymentSummaryResponse> {
		return this.analyticsService.getOwnerPaymentSummary(ownerId)
	}

	async sendPaymentReminder(
		tenantId: string,
		email: string,
		amountDue: number
	): Promise<SendPaymentReminderResponse> {
		return this.analyticsService.sendPaymentReminder(tenantId, email, amountDue)
	}

	async queryTenantPayments(
		tenantId: string,
		filters?: Record<string, unknown>
	): Promise<RentPayment[]> {
		return this.analyticsService.queryTenantPayments(tenantId, filters)
	}

	mapPaymentIntentToRecord(intent: Record<string, unknown>): TenantPaymentRecord {
		return this.analyticsService.mapPaymentIntentToRecord(intent)
	}

	isLateFeeRecord(record: RentPayment | TenantPaymentRecord): boolean {
		return this.analyticsService.isLateFeeRecord(record)
	}

	// ============================================================================
	// INVITATIONS
	// ============================================================================

	async inviteTenantWithLease(
		userId: string,
		dto: InviteTenantDto & { lease_start_date?: string; rent_amount?: number; first_name?: string; last_name?: string; avatarUrl?: string }
	): Promise<{
		success: boolean
		tenant_id: string
		lease_id: string
		message: string
	}> {
		const { stripe_customer_id: _, ...invitePayload } = {
			...dto,
			lease_start_date: dto.lease_start_date || new Date().toISOString(),
			rent_amount: dto.rent_amount || 0,
			stripe_customer_id: undefined
		}

		return this.invitationService.inviteTenantWithLease(userId, invitePayload)
	}

	async sendTenantInvitationV2(
		userId: string,
		dto: InviteTenantDto & { lease_start_date?: string; rent_amount?: number; first_name?: string; last_name?: string; avatarUrl?: string }
	): Promise<{
		success: boolean
		tenant_id: string
		lease_id: string
		message: string
	}> {
		const { stripe_customer_id: _, ...invitePayload } = {
			...dto,
			lease_start_date: dto.lease_start_date || new Date().toISOString(),
			rent_amount: dto.rent_amount || 0,
			stripe_customer_id: undefined
		}

		return this.invitationService.inviteTenantWithLease(userId, invitePayload)
	}

	async checkExistingAuthUser(email: string): Promise<boolean> {
		return this.invitationService.checkExistingAuthUser(email)
	}

	async validateInvitationToken(token: string): Promise<{
		valid: boolean
		tenant_id?: string
		email?: string
		error?: string
	}> {
		return this.invitationTokenService.validateToken(token)
	}

	async acceptInvitationToken(token: string, authUserId: string): Promise<Tenant> {
		return this.invitationTokenService.acceptToken(token, authUserId)
	}

	async activateTenantFromAuthUser(authUserId: string): Promise<Tenant> {
		return this.invitationTokenService.activateTenantFromAuthUser(authUserId)
	}

	async resendInvitation(userId: string, tenantId: string): Promise<{ success: boolean; message: string }> {
		return this.resendInvitationService.resendInvitation(userId, tenantId)
	}
}
