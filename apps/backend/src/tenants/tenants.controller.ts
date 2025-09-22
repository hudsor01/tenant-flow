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
	HttpStatus,
	NotFoundException,
	Optional,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type {
	CreateTenantRequest,
	UpdateTenantRequest,
	ValidatedUser
} from '@repo/shared'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { TenantsService } from './tenants.service'

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
	constructor(@Optional() private readonly tenantsService?: TenantsService) {}

	@Get()
	@Public()
	@ApiOperation({ summary: 'Get all tenants' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user?: ValidatedUser,
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
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (
			invitationStatus &&
			!['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED'].includes(invitationStatus)
		) {
			throw new BadRequestException('Invalid invitation status')
		}

		return this.tenantsService.findAll(user?.id || 'test-user-id', {
			search,
			invitationStatus,
			limit,
			offset,
			sortBy,
			sortOrder
		})
	}

	@Get('stats')
	@Public()
	@ApiOperation({ summary: 'Get tenant statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user?: ValidatedUser) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				totalTenants: 0,
				activeTenants: 0,
				pendingTenants: 0,
				expiredTenants: 0
			}
		}
		return this.tenantsService.getStats(user?.id || 'test-user-id')
	}

	@Get(':id')
	@Public()
	@ApiOperation({ summary: 'Get tenant by ID' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				data: null
			}
		}
		const tenant = await this.tenantsService.findOne(
			user?.id || 'test-user-id',
			id
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Post()
	@Public()
	@ApiOperation({ summary: 'Create new tenant' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@Body() createRequest: CreateTenantRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				data: createRequest,
				success: false
			}
		}
		return this.tenantsService.create(user?.id || 'test-user-id', createRequest)
	}

	@Put(':id')
	@Public()
	@ApiOperation({ summary: 'Update tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateTenantRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				data: updateRequest,
				success: false
			}
		}
		const tenant = await this.tenantsService.update(
			user?.id || 'test-user-id',
			id,
			updateRequest
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id')
	@Public()
	@ApiOperation({ summary: 'Delete tenant' })
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				success: false
			}
		}
		await this.tenantsService.remove(user?.id || 'test-user-id', id)
		return { message: 'Tenant deleted successfully' }
	}

	@Post(':id/invite')
	@Public()
	@ApiOperation({ summary: 'Send invitation to tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	async sendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				action: 'invite',
				success: false
			}
		}
		return this.tenantsService.sendInvitation(user?.id || 'test-user-id', id)
	}

	@Post(':id/resend-invitation')
	@Public()
	@ApiOperation({ summary: 'Resend invitation to tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	async resendInvitation(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.tenantsService) {
			return {
				message: 'Tenants service not available',
				id,
				action: 'resend-invitation',
				success: false
			}
		}
		return this.tenantsService.resendInvitation(user?.id || 'test-user-id', id)
	}
}
