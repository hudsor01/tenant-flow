/**
 * Tenant Emergency Contact Controller
 *
 * Handles all emergency contact CRUD endpoints:
 * - GET /tenants/:id/emergency-contact
 * - POST /tenants/:id/emergency-contact
 * - PUT /tenants/:id/emergency-contact
 * - DELETE /tenants/:id/emergency-contact
 *
 * Extracted from TenantsController to maintain <300 line limit per CLAUDE.md
 */

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { TenantEmergencyContactService } from './tenant-emergency-contact.service'
import type {
	CreateEmergencyContactDto,
	UpdateEmergencyContactDto
} from './dto/emergency-contact.dto'

@ApiTags('Tenant Emergency Contacts')
@ApiBearerAuth('supabase-auth')
@Controller('tenants')
export class TenantEmergencyContactController {
	constructor(
		private readonly emergencyContactService: TenantEmergencyContactService
	) {}

	/**
	 * GET /tenants/:id/emergency-contact
	 * Get emergency contact for a tenant
	 * Returns null if no emergency contact exists
	 */
	@ApiOperation({ summary: 'Get emergency contact', description: 'Get emergency contact for a tenant (returns null if none exists)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Emergency contact retrieved (or null)' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/emergency-contact')
	async getEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const emergency_contact =
			await this.emergencyContactService.getEmergencyContact(user_id, id, token)

		// Return null if not found (not an error - just no contact yet)
		return emergency_contact
	}

	/**
	 * POST /tenants/:id/emergency-contact
	 * Create emergency contact for a tenant
	 * Enforces one-to-one relationship (unique constraint on tenant_id)
	 */
	@ApiOperation({ summary: 'Create emergency contact', description: 'Create emergency contact for a tenant (one per tenant)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 201, description: 'Emergency contact created successfully' })
	@ApiResponse({ status: 400, description: 'Failed to create or already exists' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post(':id/emergency-contact')
	async createEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: CreateEmergencyContactDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const serviceDto = {
			contact_name: dto.contactName,
			relationship: dto.relationship,
			phone_number: dto.phoneNumber
		}
		const emergency_contact =
			await this.emergencyContactService.createEmergencyContact(
				user_id,
				id,
				serviceDto,
				token
			)

		if (!emergency_contact) {
			throw new BadRequestException('Failed to create emergency contact')
		}

		return emergency_contact
	}

	/**
	 * PUT /tenants/:id/emergency-contact
	 * Update emergency contact for a tenant
	 * Partial update - only provided fields will be updated
	 */
	@ApiOperation({ summary: 'Update emergency contact', description: 'Update emergency contact for a tenant (partial update)' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Emergency contact updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Emergency contact not found' })
	@Put(':id/emergency-contact')
	async updateEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateEmergencyContactDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		// Filter out undefined values for exactOptionalPropertyTypes
		const updated_data: {
			contactName?: string
			relationship?: string
			phoneNumber?: string
			email?: string | null
		} = {}
		if (dto.contactName !== undefined)
			updated_data.contactName = dto.contactName
		if (dto.relationship !== undefined)
			updated_data.relationship = dto.relationship
		if (dto.phoneNumber !== undefined)
			updated_data.phoneNumber = dto.phoneNumber
		if (dto.email !== undefined) updated_data.email = dto.email ?? null

		const emergency_contact =
			await this.emergencyContactService.updateEmergencyContact(
				user_id,
				id,
				updated_data,
				token
			)

		if (!emergency_contact) {
			throw new NotFoundException('Emergency contact not found')
		}

		return emergency_contact
	}

	/**
	 * DELETE /tenants/:id/emergency-contact
	 * Delete emergency contact for a tenant
	 */
	@ApiOperation({ summary: 'Delete emergency contact', description: 'Delete emergency contact for a tenant' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Emergency contact deleted successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Emergency contact not found' })
	@Delete(':id/emergency-contact')
	async deleteEmergencyContact(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const deleted = await this.emergencyContactService.deleteEmergencyContact(
			user_id,
			id,
			token
		)

		if (!deleted) {
			throw new NotFoundException('Emergency contact not found')
		}

		return { success: true, message: 'Emergency contact deleted successfully' }
	}
}
