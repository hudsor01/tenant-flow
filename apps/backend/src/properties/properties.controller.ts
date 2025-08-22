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
import { UnifiedAuthGuard } from '../shared/guards/unified-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
// import { AuthToken } from '../shared/decorators/auth-token.decorator' // Decorator doesn't exist
import { ValidatedUser } from '../auth/auth.service'
import { PropertiesService, PropertyWithRelations } from './properties.service'
import {
	CreatePropertyDto,
	UpdatePropertyDto
} from '../shared/types/dto-exports'
import { UsageLimitsGuard } from '../shared/guards/usage-limits.guard'
import { UsageLimit } from '../shared/decorators/usage-limits.decorator'
import { ErrorHandlerService } from '../services/error-handler.service'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Properties controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('properties')
@Controller('properties')
@UseGuards(UnifiedAuthGuard, UsageLimitsGuard)
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly errorHandler: ErrorHandlerService
	) {}

	@Get()
	@ApiOperation({ summary: 'Get all properties for current user' })
	@ApiResponse({
		status: 200,
		description: 'Properties retrieved successfully'
	})
	async findAll(
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		try {
			const data = await this.propertiesService.findAll(user.id)
			return {
				success: true,
				data,
				message: 'Properties retrieved successfully',
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.errorHandler.handleError(error, {
				operation: 'findAll',
				resource: 'properties',
				metadata: { userId: user.id }
			})
			throw error
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
	): Promise<ControllerApiResponse> {
		const data = await this.propertiesService.getStats(user.id)
		return {
			success: true,
			data,
			message: 'Statistics retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search properties' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') searchTerm: string,
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse<PropertyWithRelations[]>> {
		const data = await this.propertiesService.search(
			user.id,
			searchTerm || '',
					)
		return {
			success: true,
			data,
			message: 'Search completed successfully',
			timestamp: new Date().toISOString()
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
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.findOne(id, user.id)
		return {
			success: true,
			data,
			message: 'Property retrieved successfully',
			timestamp: new Date().toISOString()
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
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		try {
			const data = await this.propertiesService.create(
				createPropertyDto,
				user.id,
							)
			return {
				success: true,
				data,
				message: 'Property created successfully',
				timestamp: new Date().toISOString()
			}
		} catch (error) {
			this.errorHandler.handleError(error, {
				operation: 'create',
				resource: 'properties',
				metadata: { 
					userId: user.id, 
					propertyName: createPropertyDto.name 
				}
			})
			throw error
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
	): Promise<ControllerApiResponse<PropertyWithRelations>> {
		const data = await this.propertiesService.update(
			id,
			updatePropertyDto,
			user.id,
					)
		return {
			success: true,
			data,
			message: 'Property updated successfully',
			timestamp: new Date().toISOString()
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
	): Promise<ControllerApiResponse> {
		await this.propertiesService.remove(id, user.id)
		return {
			success: true,
			data: null,
			message: 'Property deleted successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get(':id/metrics')
	@ApiOperation({ summary: 'Get property with calculated metrics' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property metrics retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	// Global rate limiting applies
	async getWithMetrics(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse> {
		const propertyWithMetrics = await this.propertiesService.findOneWithMetrics(
			id,
			user.id,
					)
		return {
			success: true,
			data: propertyWithMetrics,
			message: 'Property metrics retrieved successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get(':id/occupancy-rate')
	@ApiOperation({ summary: 'Calculate property occupancy rate' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Occupancy rate calculated successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async getOccupancyRate(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse> {
		const occupancyRate = await this.propertiesService.calculateOccupancyRate(
			id,
			user.id,
					)
		return {
			success: true,
			data: { occupancyRate },
			message: 'Occupancy rate calculated successfully',
			timestamp: new Date().toISOString()
		}
	}

	@Get(':id/revenue')
	@ApiOperation({ summary: 'Calculate property total revenue' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Revenue calculated successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	async getTotalRevenue(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user: ValidatedUser,
	): Promise<ControllerApiResponse> {
		const totalRevenue = await this.propertiesService.calculateTotalRevenue(
			id,
			user.id,
					)
		return {
			success: true,
			data: { totalRevenue },
			message: 'Revenue calculated successfully',
			timestamp: new Date().toISOString()
		}
	}
}
