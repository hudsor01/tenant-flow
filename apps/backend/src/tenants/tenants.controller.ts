import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
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
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Get()
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
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get tenant statistics' })
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
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get tenant by ID' })
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
	}

	@Post()
	@ApiOperation({ summary: 'Create new tenant' })
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
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update tenant' })
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
			id,
			updateTenantDto,
			user.id
		)
		return {
			success: true,
			data,
			message: 'Tenant updated successfully',
			timestamp: new Date()
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete tenant' })
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
}
