import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe,
	ParseUUIDPipe
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { PropertiesService, PropertyWithRelations } from './properties.service'
import { CreatePropertyDto, UpdatePropertyDto } from '../common/dto/dto-exports'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Properties controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('properties')
@Controller('properties')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) {}

	@Get()
	@ApiOperation({ summary: 'Get all properties for current user' })
	@ApiResponse({ status: 200, description: 'Properties retrieved successfully' })
	async findAll(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		const data = await this.propertiesService.findAll(user.id)
		return {
			success: true,
			data,
			message: 'Properties retrieved successfully'
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get property statistics' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.propertiesService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully'
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search properties' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		const data = await this.propertiesService.search(user.id, searchTerm || '')
		return {
			success: true,
			data,
			message: 'Search completed successfully'
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get property by ID' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.findOne(id, user.id)
		return {
			success: true,
			data,
			message: 'Property retrieved successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new property' })
	@ApiResponse({ status: 201, description: 'Property created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'properties', action: 'create' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createPropertyDto: CreatePropertyDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.create(createPropertyDto, user.id)
		return {
			success: true,
			data,
			message: 'Property created successfully'
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property updated successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updatePropertyDto: UpdatePropertyDto,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.update(id, updatePropertyDto, user.id)
		return {
			success: true,
			data,
			message: 'Property updated successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property deleted successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@ApiResponse({ status: 400, description: 'Cannot delete property with active leases' })
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.propertiesService.remove(id, user.id)
		return {
			success: true,
			message: 'Property deleted successfully'
		}
	}
}