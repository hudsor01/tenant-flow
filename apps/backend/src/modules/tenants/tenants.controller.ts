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
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req
} from '@nestjs/common'
// Swagger imports removed
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '@repo/shared/types/backend-domain'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { TenantsService } from './tenants.service'

// @ApiTags('tenants')
// @ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
	// Logger available if needed for debugging
	// private readonly logger = new Logger(TenantsController.name)

	constructor(@Optional() private readonly tenantsService?: TenantsService) {}

	@Get()
	// @ApiOperation({ summary: 'Get all tenants' })
	// @ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('search') search?: string,
		@Query('invitationStatus') invitationStatus?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				data: [],
				total: 0,
				limit: limit || 10,
				offset: offset || 0
			}
		}

		// Built-in validation through pipes
		if (limit !== undefined && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (
			invitationStatus &&
			!['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED'].includes(invitationStatus)
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
	// @ApiOperation({ summary: 'Get tenant statistics' })
	// @ApiResponse({ status: HttpStatus.OK })
	async getStats(@Req() req: AuthenticatedRequest) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				totalTenants: 0,
				activeTenants: 0,
				pendingTenants: 0,
				expiredTenants: 0
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.getStats(userId)
	}

	@Get(':id')
	// @ApiOperation({ summary: 'Get tenant by ID' })
	// @ApiResponse({ status: HttpStatus.OK })
	// @ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				data: undefined
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		const tenant = await this.tenantsService.findOne(userId, id)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Post()
	// @ApiOperation({ summary: 'Create new tenant' })
	// @ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@Body() createRequest: CreateTenantRequest,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				data: createRequest,
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.create(userId, createRequest)
	}

	@Put(':id')
	// @ApiOperation({ summary: 'Update tenant' })
	// @ApiResponse({ status: HttpStatus.OK }}
	// @ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateTenantRequest,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				data: updateRequest,
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		const tenant = await this.tenantsService.update(userId, id, updateRequest)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id')
	// @ApiOperation({ summary: 'Delete tenant' })
	// @ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		await this.tenantsService.remove(userId, id)
		return { message: 'Tenant deleted successfully' }
	}

	@Post(':id/invite')
	// @ApiOperation({ summary: 'Send invitation to tenant' })
	// @ApiResponse({ status: HttpStatus.OK })
	async sendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				action: 'invite',
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.sendTenantInvitation(userId, id)
	}

	@Post(':id/resend-invitation')
	// @ApiOperation({ summary: 'Resend invitation to tenant' })
	// @ApiResponse({ status: HttpStatus.OK }}
	async resendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				action: 'resend-invitation',
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.resendInvitation(userId, id)
	}

	@Put(':id/emergency-contact')
	// @ApiOperation({ summary: 'Update tenant emergency contact' })
	// @ApiResponse({ status: HttpStatus.OK }}
	async updateEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body()
		emergencyContact: { name: string; phone: string; relationship: string },
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.updateEmergencyContact(
			userId,
			id,
			emergencyContact
		)
	}

	@Delete(':id/emergency-contact')
	// @ApiOperation({ summary: 'Remove tenant emergency contact' })
	// @ApiResponse({ status: HttpStatus.OK })
	async removeEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				success: false
			}
		}
		// Use Supabase's native auth.getUser() pattern
		const userId = req.user.id
		return this.tenantsService.removeEmergencyContact(userId, id)
	}
}
