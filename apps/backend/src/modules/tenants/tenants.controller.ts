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
	Logger,
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
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import { StripeConnectedGuard } from '../../shared/guards/stripe-connected.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { InviteWithLeaseDto } from './dto/invite-with-lease.dto'
import type {
	CreateTenantRequest,
	InviteTenantRequest,
	OwnerPaymentSummaryResponse,
	TenantPaymentHistoryResponse,
	UpdateTenantRequest
} from '@repo/shared/types/api-contracts'
import type { ListFilters } from './tenant-list.service'
import { TenantsService } from './tenants.service'
import { TenantInvitationService } from './tenant-invitation.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto'
import {
	CreateEmergencyContactDto,
	UpdateEmergencyContactDto
} from './dto/emergency-contact.dto'

@Controller('tenants')
export class TenantsController {
	private readonly logger = new Logger(TenantsController.name)

	constructor(
		private readonly tenantsService: TenantsService,
		private readonly tenantInvitationService: TenantInvitationService
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
			!['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED', 'REVOKED'].includes(
				invitationStatus
			)
		) {
			throw new BadRequestException('Invalid invitation status')
		}

		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		const filters: Record<string, unknown> = {}
		if (search !== undefined) filters.search = search
		if (invitationStatus !== undefined) filters.invitationStatus = invitationStatus
		if (limit !== undefined) filters.limit = limit
		if (offset !== undefined) filters.offset = offset

		return this.tenantsService.findAllWithLeaseInfo(user_id, filters as Omit<ListFilters, 'status'>)
	}

	@Get('stats')
	async getStats(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		return this.tenantsService.getStats(user_id)
	}

	@Get('summary')
	async getSummary(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		return this.tenantsService.getSummary(user_id)
	}

	/**
	 * GET /tenants/:id/with-lease
	 * Returns tenant with full lease and unit information
	 * Optimized endpoint for tenant detail pages
	 */
	@Get(':id/with-lease')
	async findOneWithLease(
		@Param('id', ParseUUIDPipe) id: string
	) {
		const tenantWithLease = await this.tenantsService.findOneWithLease(
			id
		)
		if (!tenantWithLease) {
			throw new NotFoundException('Tenant not found')
		}
		return tenantWithLease
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string
	) {
		const tenant = await this.tenantsService.findOne(id)
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
		const payments = await this.tenantsService.getTenantPaymentHistory(id, normalizedLimit)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	@Post()
	async create(@Body() dto: CreateTenantDto, @Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern with Zod validation
		const user_id = req.user.id
		const tenant = await this.tenantsService.create(
			user_id,
			dto as unknown as CreateTenantRequest
		)

		// Auto-send invitation email after tenant creation (V2 - Supabase Auth)
		// This is fire-and-forget to not block the response
		// Note: property_id/lease_id are assigned later when lease is created
		this.tenantsService.sendTenantInvitationV2(user_id, { email: tenant.id } as InviteTenantRequest).catch(err => {
			// Log but don't fail the tenant creation if email fails
			this.logger.warn(
				'Failed to send invitation email after tenant creation',
				{
					tenant_id: tenant.id,
					error: err instanceof Error ? err.message : String(err)
				}
			)
		})

		return tenant
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateTenantDto,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern with Zod validation
		const user_id = req.user.id

		//Pass version for optimistic locking
		const expectedVersion = (dto as unknown as { version?: number }).version
		const tenant = await this.tenantsService.update(
			user_id,
			id,
			dto as unknown as UpdateTenantRequest,
			expectedVersion
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
		const preferences = await this.tenantsService.getNotificationPreferences(
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

		const result = await this.tenantsService.updateNotificationPreferences(
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
		@Req() req: AuthenticatedRequest
	) {
		if (!body.moveOutDate || !body.moveOutReason) {
			throw new BadRequestException(
				'moveOutDate and moveOutReason are required'
			)
		}
		const user_id = req.user.id
		const tenant = await this.tenantsService.markAsMovedOut(
			user_id,
			id,
			body.moveOutDate,
			body.moveOutReason
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id/hard-delete')
	async hardDelete(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		await this.tenantsService.hardDelete(user_id, id)
		return { message: 'Tenant permanently deleted' }
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		await this.tenantsService.remove(user_id, id)
	}

	/**
	 * NEW: Send tenant invitation via Supabase Auth (V2 - Phase 3.1)
	 * Uses Supabase Auth's built-in invitation system
	 */
	@Post(':id/invite-v2')
	async sendInvitationV2(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		return this.tenantsService.sendTenantInvitationV2(
			user_id,
			{ email: id } as InviteTenantRequest
		)
	}

	/**
	 * MODERN: Invite tenant with lease using Stripe + Supabase

	 * Architecture:
	 * - PropertyOwnershipGuard: Verifies user owns the property
	 * - StripeConnectedGuard: Verifies user has completed Stripe onboarding
	 * - Atomic tenant + lease creation via Supabase RPC
	 * - Stripe Customer + Subscription with inline pricing
	 * - Stripe Checkout for payment method collection
	 * - Supabase Auth invitation email with checkout URL
	 */
	@Post('invite-with-lease')
	@UseGuards(PropertyOwnershipGuard, StripeConnectedGuard)
	async inviteTenantWithLease(
		@Body() body: InviteWithLeaseDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		return this.tenantInvitationService.inviteTenantWithLease(
		user_id,
		{
			email: body.tenantData.email,
			first_name: body.tenantData.first_name,
			last_name: body.tenantData.last_name,
			phone: body.tenantData.phone,
			property_id: body.leaseData.property_id,
			unit_id: body.leaseData.unit_id,
			rent_amount: body.leaseData.rent_amount,
			security_deposit: body.leaseData.security_deposit,
			lease_start_date: body.leaseData.start_date,
			lease_end_date: body.leaseData.end_date
		}
	)
	}

	@Post(':id/resend-invitation')
	async resendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const user_id = req.user.id
		return this.tenantsService.resendInvitation(user_id, id)
	}

	/**
	 * Validate invitation token (public endpoint - no auth required)
	 * Used by tenant invitation landing page
	 */
	@Get('invitation/:token')
	@SetMetadata('isPublic', true)
	async validateInvitation(@Param('token') token: string) {
		return this.tenantsService.validateInvitationToken(token)
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
		return this.tenantsService.acceptInvitationToken(token, body.authuser_id)
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
		return this.tenantsService.activateTenantFromAuthUser(body.authuser_id)
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
		const emergency_contact = await this.tenantsService.getEmergencyContact(
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

		const emergency_contact = await this.tenantsService.createEmergencyContact(
			user_id,
			id,
			{
				...dto,
				email: dto.email ?? null
			}
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

		const emergency_contact = await this.tenantsService.updateEmergencyContact(
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
		const deleted = await this.tenantsService.deleteEmergencyContact(user_id, id)

		if (!deleted) {
			throw new NotFoundException('Emergency contact not found')
		}

		return { success: true, message: 'Emergency contact deleted successfully' }
	}

	@Get('me/payments')
	async getMyPayments(
		@Req() req: AuthenticatedRequest,
		@Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number
	): Promise<TenantPaymentHistoryResponse> {
		const user_id = req.user.id
		const normalizedLimit = Math.min(Math.max(limit ?? 20, 1), 100)

		// Get the tenant for this user first
		const tenant = await this.tenantsService.getTenantByAuthUserId(user_id)
		const payments = await this.tenantsService.getTenantPaymentHistory(tenant.id, normalizedLimit)
		return { payments } as unknown as TenantPaymentHistoryResponse
	}

	@Get('payments/summary')
	async getPaymentSummary(
		@Req() req: AuthenticatedRequest
	): Promise<OwnerPaymentSummaryResponse> {
		const user_id = req.user.id
		return this.tenantsService.getOwnerPaymentSummary(user_id)
	}

	@Post('payments/reminders')
	async sendPaymentReminder(
		@Body() body: { tenant_id: string; email: string; amount_due: number }
	) {
		return this.tenantsService.sendPaymentReminder(
			body.tenant_id,
			body.email,
			body.amount_due
		)
	}
}
