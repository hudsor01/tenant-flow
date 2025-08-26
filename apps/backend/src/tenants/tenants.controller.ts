/**
 * 🚨 ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS 🚨
 *
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * ❌ FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import {
	Controller,
	Get,
	Post,
	Put,
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
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Get()
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
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get tenant statistics' })
	@ApiResponse({ status: HttpStatus.OK })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.tenantsService.getStats(user.id)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get tenant by ID' })
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
	}

	@Post()
	@ApiOperation({ summary: 'Create new tenant' })
	@ApiResponse({ status: HttpStatus.CREATED })
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createRequest: CreateTenantRequest
	) {
		return this.tenantsService.create(user.id, createRequest)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update tenant' })
	@ApiResponse({ status: HttpStatus.OK })
	@ApiResponse({ status: HttpStatus.NOT_FOUND })
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updateRequest: UpdateTenantRequest
	) {
		const tenant = await this.tenantsService.update(
			user.id,
			id,
			updateRequest
		)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete tenant' })
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
}
