/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS

 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req,
	SetMetadata,
	UseGuards
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { InviteWithLeaseDto } from './dto/invite-with-lease.dto'
import type {
	OwnerPaymentSummaryResponse,
	TenantPaymentHistoryResponse
} from '@repo/shared/types/api-contracts'
import type { ListFilters } from './tenant-query.service'
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { TenantPaymentService } from './tenant-payment.service'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto'
import type {
	CreateEmergencyContactDto,
	UpdateEmergencyContactDto
} from './dto/emergency-contact.dto'

@Controller('tenants')
export class TenantsController {
	constructor(
		private readonly queryService: TenantQueryService,
		private readonly crudService: TenantCrudService,
		private readonly emergencyContactService: TenantEmergencyContactService,
		private readonly notificationPreferencesService: TenantNotificationPreferencesService,
		private readonly paymentService: TenantPaymentService,
		private readonly platformInvitationService: TenantPlatformInvitationService,
		private readonly invitationTokenService: TenantInvitationTokenService
	) {}

	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('search') search?: string,
		@Query('invitationStatus') invitationStatus?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number
	) {
		// Built-in validation through pipes
		if (limit !== undefined && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (
			invitationStatus &&
			!['pending', 'sent', 'accepted', 'expired', 'cancelled'].includes(
				invitationStatus
			)
		) {
			throw new BadRequestException('Invalid invitation status')
		}

		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '') ?? undefined
		const filters: Record<string, unknown> = { token }
		if (search !== undefined) filters.search = search
		if (invitationStatus !== undefined) filters.invitationStatus = invitationStatus
		if (limit !== undefined) filters.limit = limit
		if (offset !== undefined) filters.offset = offset

		const data = await this.queryService.findAllWithLeaseInfo(user_id, filters as Omit<ListFilters, 'status'>)

		// Return PaginatedResponse format expected by frontend
		return {
			data,
			total: data.length
		}
	}

	@Get('stats')
	async getStats(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		return this.queryService.getStats(user_id)
	}

	@Get('summary')
	async getSummary(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		return this.queryService.getSummary(user_id)
	}

	@Get('invitations')
	async getInvitations(
		@Req() req: AuthenticatedRequest,
		@Query('status') status?: 'sent' | 'accepted' | 'expired' | 'cancelled',
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
		@Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit?: number
	) {
		const user_id = req.user.id
		return this.queryService.getInvitations(user_id, {
			...(status && { status }),
			...(page && { page }),
			...(limit && { limit })
		})
	}

	@Post('invitations/:id/cancel')
	async cancelInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		await this.platformInvitationService.cancelInvitation(user_id, id)
		return { success: true }
	}

	/**
	 * GET /tenants/:id/with-lease
	 * Returns tenant with full lease and unit information
	 * Optimized endpoint for tenant detail pages
	 */
	@Get(':id/with-lease')
	async findOneWithLease(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const tenantWithLease = await this.queryService.findOneWithLease(
			id,
			token
		)
		if (!tenantWithLease) {
			throw new NotFoundException('Tenant not found')
		}
		return tenantWithLease
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const tenant = await this.queryService.findOne(id, token)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Get(':id/payments')
	async getPayments(
		@Param('id', ParseUUIDPipe) id: string,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
	): Promise<TenantPaymentHistoryResponse> {
		const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100)
		const payments = await this.queryService.getTenantPaymentHistory(id, normalizedLimit)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	@Post()
	async create(@Body() dto: CreateTenantDto, @Req() req: AuthenticatedRequest, @JwtToken() token: string) {
		// Use Supabase's native auth.getUser() pattern with Zod validation
		const user_id = req.user.id
		const tenant = await this.crudService.create(
			user_id,
			dto,
			token
		)

		// NOTE: Auto-invitation removed - requires full lease data (property_id, unit_id)
		// Use POST /tenants/invite-with-lease endpoint instead to invite tenants with complete lease information

		return tenant
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateTenantDto,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		// Use Supabase's native auth.getUser() pattern with Zod validation
		const user_id = req.user.id

		const tenant = await this.crudService.update(
			user_id,
			id,
			dto,
			token
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	/**
	 * GET /tenants/:id/notification-preferences
	 * Get notification preferences for a specific tenant
	 */
	@Get(':id/notification-preferences')
	async getNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const preferences = await this.notificationPreferencesService.getPreferences(
			user_id,
			id
		)
		if (!preferences) {
			throw new NotFoundException('Tenant not found')
		}
		return preferences
	}

	/**
	 * PUT /tenants/:id/notification-preferences
	 * Update notification preferences for a specific tenant
	 */
	@Put(':id/notification-preferences')
	async updateNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateNotificationPreferencesDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		const result = await this.notificationPreferencesService.updatePreferences(
			user_id,
			id,
			dto as Record<string, boolean>
		)
		if (!result) {
			throw new NotFoundException('Tenant not found')
		}
		return result
	}

	@Put(':id/mark-moved-out')
	async markAsMovedOut(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() body: { moveOutDate: string; moveOutReason: string },
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		if (!body.moveOutDate || !body.moveOutReason) {
			throw new BadRequestException(
				'moveOutDate and moveOutReason are required'
			)
		}
		const user_id = req.user.id
		const tenant = await this.crudService.markAsMovedOut(
			user_id,
			id,
			body.moveOutDate,
			body.moveOutReason,
			token
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id/hard-delete')
	async hardDelete(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const user_id = req.user.id
		await this.crudService.hardDelete(user_id, id, token)
		return { message: 'Tenant permanently deleted' }
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		await this.crudService.softDelete(user_id, id, token)
	}

	/**
	 * Invite tenant to platform (no lease created)
	 *
	 * NEW ARCHITECTURE:
	 * - Platform invitation ONLY - no lease, no Stripe
	 * - PropertyOwnershipGuard: Verifies user owns the property (if provided)
	 * - Lease creation is a SEPARATE workflow after tenant accepts
	 * - Stripe subscription created only when BOTH parties sign the lease
	 */
	@Post('invite')
	@UseGuards(PropertyOwnershipGuard)
	@Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 invitations per hour
	async inviteToPlatform(
		@Body() body: InviteWithLeaseDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		// Build request object conditionally to satisfy exactOptionalPropertyTypes
		const request: {
			email: string
			first_name: string
			last_name: string
			phone?: string
			property_id?: string
			unit_id?: string
		} = {
			email: body.tenantData.email,
			first_name: body.tenantData.first_name,
			last_name: body.tenantData.last_name
		}
		if (body.tenantData.phone) request.phone = body.tenantData.phone
		if (body.leaseData?.property_id) request.property_id = body.leaseData.property_id
		if (body.leaseData?.unit_id) request.unit_id = body.leaseData.unit_id

		return this.platformInvitationService.inviteToPlatform(user_id, request)
	}

	@Post(':id/resend-invitation')
	@Throttle({ default: { limit: 1, ttl: 900000 } }) // 1 resend per 15 minutes
	async resendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		await this.platformInvitationService.resendInvitation(user_id, id)
		return { success: true }
	}

	/**
	 * Validate invitation token (public endpoint - no auth required)
	 * Used by tenant invitation landing page
	 */
	@Get('invitation/:token')
	@SetMetadata('isPublic', true)
	async validateInvitation(@Param('token') token: string) {
		return this.invitationTokenService.validateToken(token)
	}

	@Post('invitation/:token/accept')
	@SetMetadata('isPublic', true)
	async acceptInvitation(
		@Param('token') token: string,
		@Body() body: { authuser_id: string }
	) {
		if (!body.authuser_id) {
			throw new BadRequestException('authuser_id is required')
		}
		return this.invitationTokenService.acceptToken(token, body.authuser_id)
	}

	/**
	 * NEW: Activate tenant from Supabase Auth user (Phase 3.1)
	 * Called from frontend after successful invitation acceptance
	 * Public endpoint - authenticated via Supabase Auth session
	 */
	@Post('activate')
	@SetMetadata('isPublic', true)
	async activateTenant(@Body() body: { authuser_id: string }) {
		if (!body.authuser_id) {
			throw new BadRequestException('authuser_id is required')
		}
		return this.invitationTokenService.activateTenantFromAuthUser(body.authuser_id)
	}

	// ========================================
	// Emergency Contact Endpoints
	// ========================================

	/**
	 * Get emergency contact for a tenant
	 * Returns null if no emergency contact exists
	 */
	@Get(':id/emergency-contact')
	async getEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const emergency_contact = await this.emergencyContactService.getEmergencyContact(
			user_id,
			id
		)

		// Return null if not found (not an error - just no contact yet)
		return emergency_contact
	}

	/**
	 * Create emergency contact for a tenant
	 * Enforces one-to-one relationship (unique constraint on tenant_id)
	 */
	@Post(':id/emergency-contact')
	async createEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: CreateEmergencyContactDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		const serviceDto = {
			contact_name: dto.contactName,
			relationship: dto.relationship,
			phone_number: dto.phoneNumber
		}
		const emergency_contact = await this.emergencyContactService.createEmergencyContact(
			user_id,
			id,
			serviceDto
		)

		if (!emergency_contact) {
			throw new BadRequestException('Failed to create emergency contact')
		}

		return emergency_contact
	}

	/**
	 * Update emergency contact for a tenant
	 * Partial update - only provided fields will be updated
	 */
	@Put(':id/emergency-contact')
	async updateEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateEmergencyContactDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		// Filter out undefined values for exactOptionalPropertyTypes
		const updated_data: {
			contactName?: string
			relationship?: string
			phoneNumber?: string
			email?: string | null
		} = {}
		if (dto.contactName !== undefined) updated_data.contactName = dto.contactName
		if (dto.relationship !== undefined)
			updated_data.relationship = dto.relationship
		if (dto.phoneNumber !== undefined) updated_data.phoneNumber = dto.phoneNumber
		if (dto.email !== undefined) updated_data.email = dto.email ?? null

		const emergency_contact = await this.emergencyContactService.updateEmergencyContact(
			user_id,
			id,
			updated_data
		)

		if (!emergency_contact) {
			throw new NotFoundException('Emergency contact not found')
		}

		return emergency_contact
	}

	/**
	 * Delete emergency contact for a tenant
	 */
	@Delete(':id/emergency-contact')
	async deleteEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const deleted = await this.emergencyContactService.deleteEmergencyContact(user_id, id)

		if (!deleted) {
			throw new NotFoundException('Emergency contact not found')
		}

		return { success: true, message: 'Emergency contact deleted successfully' }
	}

	@Get('me/payments')
	async getMyPayments(
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
	): Promise<TenantPaymentHistoryResponse> {
		const user_id = req.user.id
		const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100)

		// Get the tenant for this user first
		const tenant = await this.queryService.getTenantByAuthUserId(user_id, token)
		const payments = await this.queryService.getTenantPaymentHistory(tenant.id, normalizedLimit)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	@Get('payments/summary')
	async getPaymentSummary(
		@Req() req: AuthenticatedRequest
	): Promise<OwnerPaymentSummaryResponse> {
		// Defensive: Return empty response if no auth (e.g., SSR hydration)
		if (!req.user?.id) {
			return { lateFeeTotal: 0, unpaidTotal: 0, unpaidCount: 0, tenantCount: 0 }
		}
		return this.paymentService.getOwnerPaymentSummary(req.user.id)
	}

	@Post('payments/reminders')
	async sendPaymentReminder(
		@Req() req: AuthenticatedRequest,
		@Body() body: { tenant_id: string; note?: string }
	) {
		const user_id = req.user.id
		return this.paymentService.sendPaymentReminder(
			user_id,
			body.tenant_id,
			body.note
		)
	}
}
