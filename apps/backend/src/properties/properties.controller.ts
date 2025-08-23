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
import { AuthToken } from '../shared/decorators/auth-token.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { PropertiesService, PropertyWithRelations } from './properties.service'
import {
	CreatePropertyDto,
	UpdatePropertyDto
} from '../shared/types/dto-exports'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { UsageLimit } from '../shared/decorators/usage-limits.decorator'
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
	@ApiResponse({
		status: 200,
		description: 'Properties retrieved successfully'
	})
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		const data = await this.propertiesService.findAll(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Properties retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get property statistics' })
	@ApiResponse({
		status: 200,
		description: 'Statistics retrieved successfully'
	})
	async getStats(
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		const data = await this.propertiesService.getStats(user.id, authToken)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully',
			timestamp: new Date()
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search properties' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		const data = await this.propertiesService.search(
			user.id,
			searchTerm || '',
			authToken
		)
		return {
			success: true,
			data,
			message: 'Search completed successfully',
			timestamp: new Date()
		}
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get property by ID' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({
		status: 200,
		description: 'Property retrieved successfully'
	})
	@ApiResponse({ status: 404, description: 'Property not found' })
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.findOne(
			id,
			user.id,
			authToken
		)
		return {
			success: true,
			data,
			message: 'Property retrieved successfully',
			timestamp: new Date()
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new property' })
	@ApiResponse({ status: 201, description: 'Property created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	// Global rate limiting applies
	@UsageLimit({ feature: 'properties' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() createPropertyDto: CreatePropertyDto,
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.create(
			createPropertyDto,
			user.id,
			authToken
		)
		return {
			success: true,
			data,
			message: 'Property created successfully',
			timestamp: new Date()
		}
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property updated successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	// Global rate limiting applies
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updatePropertyDto: UpdatePropertyDto,
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.update(
			id,
			updatePropertyDto,
			user.id,
			authToken
		)
		return {
			success: true,
			data,
			message: 'Property updated successfully',
			timestamp: new Date()
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property deleted successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@ApiResponse({
		status: 400,
		description: 'Cannot delete property with active leases'
	})
	// Global rate limiting applies
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser,
		@AuthToken() authToken?: string
	): Promise<ControllerApiResponse> {
		await this.propertiesService.remove(id, user.id, authToken)
		return {
			success: true,
			data: null,
			message: 'Property deleted successfully',
			timestamp: new Date()
		}
	}
}
