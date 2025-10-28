/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 *
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
	SetMetadata
} from '@nestjs/common'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { TenantsService } from './tenants.service'

@Controller('tenants')
export class TenantsController {
	private readonly logger = new Logger(TenantsController.name)

	constructor(private readonly tenantsService: TenantsService) {}

	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('search') search?: string,
		@Query('invitationStatus') invitationStatus?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
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
		const userId = req.user.id

		return this.tenantsService.findAll(userId, {
			search,
			invitationStatus,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	@Get('stats')
	async getStats(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.getStats(userId)
	}

	@Get('summary')
	async getSummary(@Req() req: AuthenticatedRequest) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.getSummary(userId)
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		const tenant = await this.tenantsService.findOne(userId, id)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Post()
	async create(
		@Body() createRequest: CreateTenantRequest,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		const tenant = await this.tenantsService.create(userId, createRequest)

		// Auto-send invitation email after tenant creation (V2 - Supabase Auth)
		// This is fire-and-forget to not block the response
		// Note: propertyId/leaseId are assigned later when lease is created
		this.tenantsService
			.sendTenantInvitationV2(userId, tenant.id)
			.catch(err => {
				// Log but don't fail the tenant creation if email fails
				this.logger.warn(
					'Failed to send invitation email after tenant creation',
					{
						tenantId: tenant.id,
						error: err instanceof Error ? err.message : String(err)
					}
				)
			})

		return tenant
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateTenantRequest,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id

		// 🔐 BUG FIX #2: Pass version for optimistic locking
		const expectedVersion = (updateRequest as { version?: number }).version
		const tenant = await this.tenantsService.update(
			userId,
			id,
			updateRequest,
			expectedVersion
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
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
		const userId = req.user.id
		const tenant = await this.tenantsService.markAsMovedOut(
			userId,
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
		const userId = req.user.id
		await this.tenantsService.hardDelete(userId, id)
		return { message: 'Tenant permanently deleted' }
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		await this.tenantsService.remove(userId, id)
	}

	@Post(':id/invite')
	async sendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body() body: { leaseId?: string }
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.sendTenantInvitation(userId, id, body.leaseId)
	}

	/**
	 * ✅ NEW: Send tenant invitation via Supabase Auth (V2 - Phase 3.1)
	 * Uses Supabase Auth's built-in invitation system
	 */
	@Post(':id/invite-v2')
	async sendInvitationV2(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@Body() body: { propertyId?: string; leaseId?: string }
	) {
		const userId = req.user.id
		return this.tenantsService.sendTenantInvitationV2(
			userId,
			id,
			body.propertyId,
			body.leaseId
		)
	}

	/**
	 * ✅ NEW: Complete tenant invitation with lease creation (Industry Standard - Phase 3.1)
	 * Creates tenant + lease + sends Supabase Auth invitation in one atomic operation
	 * Based on Buildium/AppFolio/TurboTenant best practices
	 */
	@Post('invite-with-lease')
	async inviteTenantWithLease(
		@Body() body: { 
			tenantData: { 
				email: string
				firstName: string
				lastName: string
				phone?: string 
			}
			leaseData: { 
				propertyId: string
				unitId?: string
				rentAmount: number
				securityDeposit: number
				startDate: string
				endDate: string 
			} 
		},
		@Req() req: AuthenticatedRequest
	) {
		const userId = req.user.id
		
		// Validate required fields
		if (!body.tenantData?.email || !body.tenantData?.firstName || !body.tenantData?.lastName) {
			throw new BadRequestException('Tenant email, firstName, and lastName are required')
		}
		
		if (!body.leaseData?.propertyId || !body.leaseData?.rentAmount || !body.leaseData?.startDate || !body.leaseData?.endDate) {
			throw new BadRequestException('Lease propertyId, rentAmount, startDate, and endDate are required')
		}
		
		return this.tenantsService.inviteTenantWithLease(
			userId,
			body.tenantData,
			body.leaseData
		)
	}

	@Post(':id/resend-invitation')
	async resendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.resendInvitation(userId, id)
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
	async acceptInvitation(@Param('token') token: string) {
		return this.tenantsService.acceptInvitationToken(token)
	}

	/**
	 * ✅ NEW: Activate tenant from Supabase Auth user (Phase 3.1)
	 * Called from frontend after successful invitation acceptance
	 * Public endpoint - authenticated via Supabase Auth session
	 */
	@Post('activate')
	@SetMetadata('isPublic', true)
	async activateTenant(@Body() body: { authUserId: string }) {
		if (!body.authUserId) {
			throw new BadRequestException('authUserId is required')
		}
		return this.tenantsService.activateTenantFromAuthUser(body.authUserId)
	}

	@Put(':id/emergency-contact')
	async updateEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body()
		emergencyContact: { name: string; phone: string; relationship: string },
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.updateEmergencyContact(
			userId,
			id,
			emergencyContact
		)
	}

	@Delete(':id/emergency-contact')
	async removeEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.removeEmergencyContact(userId, id)
	}
}
