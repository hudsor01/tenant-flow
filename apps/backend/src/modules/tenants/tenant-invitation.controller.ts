/**
 * Tenant Invitation Controller
 *
 * Handles all tenant invitation endpoints:
 * - Platform invitations (invite, resend, cancel)
 * - Token validation and acceptance
 * - Tenant activation
 *
 * Extracted from TenantsController to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Query,
	Req,
	SetMetadata,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { PropertyOwnershipGuard } from '../../shared/guards/property-ownership.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { InviteWithLeaseDto } from './dto/invite-with-lease.dto'
import { TenantQueryService } from './tenant-query.service'
import { TenantPlatformInvitationService } from './tenant-platform-invitation.service'
import { TenantInvitationTokenService } from './tenant-invitation-token.service'

@ApiTags('Tenant Invitations')
@ApiBearerAuth('supabase-auth')
@Controller('tenants')
export class TenantInvitationController {
	constructor(
		private readonly queryService: TenantQueryService,
		private readonly platformInvitationService: TenantPlatformInvitationService,
		private readonly invitationTokenService: TenantInvitationTokenService
	) {}

	/**
	 * GET /tenants/invitations
	 * List all invitations for the current owner
	 */
	@ApiOperation({ summary: 'List invitations', description: 'Get all invitations for the current owner' })
	@ApiQuery({ name: 'status', required: false, enum: ['sent', 'accepted', 'expired', 'cancelled'], description: 'Filter by invitation status' })
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page' })
	@ApiResponse({ status: 200, description: 'Invitations retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
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

	/**
	 * POST /tenants/invitations/:id/cancel
	 * Cancel a pending invitation
	 */
	@ApiOperation({ summary: 'Cancel invitation', description: 'Cancel a pending invitation' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Invitation ID' })
	@ApiResponse({ status: 200, description: 'Invitation cancelled successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Invitation not found' })
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
	 * POST /tenants/invite
	 * Invite tenant to platform (no lease created)
	 *
	 * NEW ARCHITECTURE:
	 * - Platform invitation ONLY - no lease, no Stripe
	 * - PropertyOwnershipGuard: Verifies user owns the property (if provided)
	 * - Lease creation is a SEPARATE workflow after tenant accepts
	 * - Stripe subscription created only when BOTH parties sign the lease
	 */
	@ApiOperation({ summary: 'Invite tenant', description: 'Invite a tenant to the platform (no lease created)' })
	@ApiBody({ type: InviteWithLeaseDto })
	@ApiResponse({ status: 201, description: 'Invitation sent successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 429, description: 'Rate limit exceeded (5 invitations per hour)' })
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
		if (body.leaseData?.property_id)
			request.property_id = body.leaseData.property_id
		if (body.leaseData?.unit_id) request.unit_id = body.leaseData.unit_id

		return this.platformInvitationService.inviteToPlatform(user_id, request)
	}

	/**
	 * POST /tenants/:id/resend-invitation
	 * Resend invitation email to a tenant
	 */
	@ApiOperation({ summary: 'Resend invitation', description: 'Resend invitation email to a tenant' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Invitation resent successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@ApiResponse({ status: 429, description: 'Rate limit exceeded (1 resend per 15 minutes)' })
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
	 * GET /tenants/invitation/:token
	 * Validate invitation token (public endpoint - no auth required)
	 * Used by tenant invitation landing page
	 */
	@ApiOperation({ summary: 'Validate invitation token', description: 'Validate an invitation token (public endpoint)' })
	@ApiParam({ name: 'token', type: 'string', description: 'Invitation token' })
	@ApiResponse({ status: 200, description: 'Token validated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid or expired token' })
	@Get('invitation/:token')
	@SetMetadata('isPublic', true)
	async validateInvitation(@Param('token') token: string) {
		return this.invitationTokenService.validateToken(token)
	}

	/**
	 * POST /tenants/invitation/:token/accept
	 * Accept an invitation token (public endpoint)
	 */
	@ApiOperation({ summary: 'Accept invitation', description: 'Accept an invitation token (public endpoint)' })
	@ApiParam({ name: 'token', type: 'string', description: 'Invitation token' })
	@ApiBody({ schema: { type: 'object', properties: { authuser_id: { type: 'string', format: 'uuid' } }, required: ['authuser_id'] } })
	@ApiResponse({ status: 200, description: 'Invitation accepted successfully' })
	@ApiResponse({ status: 400, description: 'Invalid token or authuser_id required' })
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
	 * POST /tenants/activate
	 * Activate tenant from Supabase Auth user (Phase 3.1)
	 * Called from frontend after successful invitation acceptance
	 * Public endpoint - authenticated via Supabase Auth session
	 */
	@ApiOperation({ summary: 'Activate tenant', description: 'Activate tenant from Supabase Auth user (public endpoint)' })
	@ApiBody({ schema: { type: 'object', properties: { authuser_id: { type: 'string', format: 'uuid' } }, required: ['authuser_id'] } })
	@ApiResponse({ status: 200, description: 'Tenant activated successfully' })
	@ApiResponse({ status: 400, description: 'authuser_id required' })
	@Post('activate')
	@SetMetadata('isPublic', true)
	async activateTenant(@Body() body: { authuser_id: string }) {
		if (!body.authuser_id) {
			throw new BadRequestException('authuser_id is required')
		}
		return this.invitationTokenService.activateTenantFromAuthUser(
			body.authuser_id
		)
	}
}
