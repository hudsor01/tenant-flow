/**
 * 🚨 ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS 🚨
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * ❌ FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
<<<<<<< HEAD
	Delete,
	Param,
	Query,
	Body,
	HttpStatus,
	ParseUUIDPipe,
	DefaultValuePipe,
	ParseIntPipe,
	BadRequestException,
	NotFoundException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiTags,
	ApiOperation,
	ApiResponse
} from '@nestjs/swagger'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '@repo/shared'
import { TenantsService } from './tenants.service'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '../schemas/tenants.schema'

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
=======
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { TenantsService, TenantWithRelations } from './tenants.service'
import { TenantCreateDto, TenantUpdateDto } from './dto'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { UsageLimit } from '../shared/decorators/usage-limits.decorator'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Tenants controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('tenants')
@Controller('tenants')
@UseGuards(UnifiedAuthGuard, UsageLimitsGuard)
>>>>>>> origin/main
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Get()
<<<<<<< HEAD
	@ApiOperation({ summary: 'Get all tenants' })
	@ApiResponse({ status: HttpStatus.OK })
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('search') search?: string,
		@Query('invitationStatus') invitationStatus?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
		@Query('sortBy', new DefaultValuePipe('createdAt')) sortBy?: string,
		@Query('sortOrder', new DefaultValuePipe('desc')) sortOrder?: string
	) {
		// Built-in validation through pipes
		if (limit && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (
			invitationStatus &&
			!['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED'].includes(
				invitationStatus
			)
		) {
			throw new BadRequestException('Invalid invitation status')
		}

		return this.tenantsService.findAll(user.id, {
			search,
			invitationStatus,
			limit,
			offset,
			sortBy,
			sortOrder
		})
=======
	@ApiOperation({ summary: 'Get all tenants for current user' })
	@ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
	async findAll(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations[]>> {
		const data = await this.tenantsService.findAll(user.id)
		return {
			success: true,
			data,
			message: 'Tenants retrieved successfully',
			timestamp: new Date()
		}
>>>>>>> origin/main
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get tenant statistics' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.tenantsService.getStats(user.id)
=======
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.tenantsService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search tenants' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations[]>> {
		const data = await this.tenantsService.search(user.id, searchTerm || '')
		return {
			success: true,
			data,
			message: 'Search completed successfully',
			timestamp: new Date()
		}
	}

	@Get('by-property/:propertyId')
	@ApiOperation({ summary: 'Get tenants by property ID' })
	@ApiParam({ name: 'propertyId', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
	async findByProperty(
		@Param('propertyId', ParseUUIDPipe) propertyId: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations[]>> {
		const data = await this.tenantsService.findByProperty(
			propertyId,
			user.id
		)
		return {
			success: true,
			data,
			message: 'Tenants retrieved successfully',
			timestamp: new Date()
		}
>>>>>>> origin/main
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get tenant by ID' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const tenant = await this.tenantsService.findOne(user.id, id)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
=======
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations>> {
		const data = await this.tenantsService.findOne(id, user.id)
		return {
			success: true,
			data,
			message: 'Tenant retrieved successfully',
			timestamp: new Date()
		}
>>>>>>> origin/main
	}

	@Post()
	@ApiOperation({ summary: 'Create new tenant' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createRequest: CreateTenantRequest
	) {
		return this.tenantsService.create(user.id, createRequest)
=======
	@ApiResponse({ status: 201, description: 'Tenant created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ feature: 'tenants' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createTenantDto: TenantCreateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations>> {
		const data = await this.tenantsService.create(createTenantDto, user.id)
		return {
			success: true,
			data,
			message: 'Tenant created successfully',
			timestamp: new Date()
		}
>>>>>>> origin/main
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update tenant' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateTenantRequest
	) {
		const tenant = await this.tenantsService.update(
			user.id,
=======
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant updated successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateTenantDto: TenantUpdateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<TenantWithRelations>> {
		const data = await this.tenantsService.update(
>>>>>>> origin/main
			id,
			updateRequest
		)
<<<<<<< HEAD
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
=======
		return {
			success: true,
			data,
			message: 'Tenant updated successfully',
			timestamp: new Date()
		}
>>>>>>> origin/main
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete tenant' })
<<<<<<< HEAD
	@ApiResponse({ status: HttpStatus.NO_CONTENT })
	async remove(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.tenantsService.remove(user.id, id)
	}

	@Post(':id/invite')
	@ApiOperation({ summary: 'Send invitation to tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	async sendInvitation(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		return this.tenantsService.sendInvitation(user.id, id)
	}

	@Post(':id/resend-invitation')
	@ApiOperation({ summary: 'Resend invitation to tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	async resendInvitation(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		return this.tenantsService.resendInvitation(user.id, id)
	}
=======
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@ApiResponse({
		status: 400,
		description: 'Cannot delete tenant with active leases'
	})
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.tenantsService.remove(id, user.id)
		return {
			success: true,
			data: null,
			message: 'Tenant deleted successfully',
			timestamp: new Date()
		}
	}
>>>>>>> origin/main
}
