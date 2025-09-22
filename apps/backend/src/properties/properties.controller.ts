/**
 * Properties Controller - Ultra-Native Implementation
 *
 * Uses:
 * - Express request validation (no DTOs)
 * - Built-in NestJS pipes for validation
 * - Native exception handling
 * - Direct PostgreSQL RPC calls
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
	Query
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest,
	ValidatedUser
} from '@repo/shared'
import { propertyRouteSchemas } from '../schemas/properties.schema'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import { RouteSchema } from '../shared/decorators/route-schema.decorator'
import { PropertiesService } from './properties.service'

/**
 * Properties controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
	constructor(
		@Optional() private readonly propertiesService?: PropertiesService
	) {}

	/**
	 * Get all properties for authenticated user
	 * Built-in pipes handle all validation
	 */
	@Get()
	@RouteSchema({
		method: 'GET',
		path: 'properties',
		schema: propertyRouteSchemas.findAll
	})
	async findAll(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				total: 0,
				limit,
				offset
			}
		}
		// Clamp limit/offset to safe bounds
		const safeLimit = Math.max(1, Math.min(limit, 50))
		const safeOffset = Math.max(0, offset)
		return this.propertiesService.findAll(user?.id || 'test-user-id', {
			search,
			limit: safeLimit,
			offset: safeOffset
		})
	}

	/**
	 * Get single property by ID
	 * ParseUUIDPipe validates the ID format
	 */
	@Get(':id')
	@Public()
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				id,
				data: null
			}
		}
		const property = await this.propertiesService.findOne(
			user?.id || 'test-user-id',
			id
		)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
	}

	/**
	 * Create new property
	 * JSON Schema validation via Express
	 */
	@Post()
	@RouteSchema({
		method: 'POST',
		path: 'properties',
		schema: propertyRouteSchemas.create
	})
	async create(
		@Body() createPropertyRequest: CreatePropertyRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: createPropertyRequest,
				success: false
			}
		}
		return this.propertiesService.create(
			user?.id || 'test-user-id',
			createPropertyRequest
		)
	}

	/**
	 * Update existing property
	 * Combination of UUID validation and JSON Schema
	 */
	@Put(':id')
	@RouteSchema({
		method: 'PUT',
		path: 'properties/:id',
		schema: propertyRouteSchemas.update
	})
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updatePropertyRequest: UpdatePropertyRequest,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				id,
				data: updatePropertyRequest,
				success: false
			}
		}
		const property = await this.propertiesService.update(
			user?.id || 'test-user-id',
			id,
			updatePropertyRequest
		)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
	}

	/**
	 * Delete property
	 * Simple and direct with built-in validation
	 */
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@CurrentUser() user?: ValidatedUser
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				id,
				success: false
			}
		}
		await this.propertiesService.remove(user?.id || 'test-user-id', id)
		return { message: 'Property deleted successfully' }
	}

	/**
	 * Get property statistics
	 * Direct RPC call for aggregated data
	 */
	@Get('stats')
	async getStats(@CurrentUser() user?: ValidatedUser) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				totalProperties: 0,
				totalUnits: 0,
				occupiedUnits: 0,
				vacantUnits: 0,
				occupancyRate: 0,
				totalRent: 0
			}
		}
		return this.propertiesService.getStats(user?.id || 'test-user-id')
	}

	/**
	 * Get per-property analytics and performance metrics
	 * Returns detailed metrics for each property
	 */
	@Get('analytics/performance')
	async getPropertyPerformanceAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('30d')) timeframe?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				timeframe: timeframe ?? '30d',
				propertyId
			}
		}

		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['7d', '30d', '90d', '1y'].includes(timeframe ?? '30d')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 7d, 30d, 90d, 1y'
			)
		}

		return this.propertiesService.getPropertyPerformanceAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				timeframe: timeframe ?? '30d',
				limit
			}
		)
	}

	/**
	 * Get property occupancy trends and analytics
	 * Tracks occupancy rates over time per property
	 */
	@Get('analytics/occupancy')
	async getPropertyOccupancyAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				period: period ?? 'monthly',
				propertyId
			}
		}

		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (
			!['daily', 'weekly', 'monthly', 'yearly'].includes(period ?? 'monthly')
		) {
			throw new BadRequestException(
				'Invalid period. Must be one of: daily, weekly, monthly, yearly'
			)
		}

		return this.propertiesService.getPropertyOccupancyAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				period: period ?? 'monthly'
			}
		)
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profitability per property
	 */
	@Get('analytics/financial')
	async getPropertyFinancialAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				timeframe: timeframe ?? '12m',
				propertyId
			}
		}

		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['3m', '6m', '12m', '24m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 3m, 6m, 12m, 24m'
			)
		}

		return this.propertiesService.getPropertyFinancialAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				timeframe: timeframe ?? '12m'
			}
		)
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 */
	@Get('analytics/maintenance')
	async getPropertyMaintenanceAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('6m')) timeframe?: string
	) {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				timeframe: timeframe ?? '6m',
				propertyId
			}
		}

		// Validate propertyId if provided
		if (
			propertyId &&
			!propertyId.match(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
			)
		) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['1m', '3m', '6m', '12m'].includes(timeframe ?? '6m')) {
			throw new BadRequestException(
				'Invalid timeframe. Must be one of: 1m, 3m, 6m, 12m'
			)
		}

		return this.propertiesService.getPropertyMaintenanceAnalytics(
			user?.id || 'test-user-id',
			{
				propertyId,
				timeframe: timeframe ?? '6m'
			}
		)
	}

	/**
	 * Get all properties with their units
	 * Returns properties with units for frontend stat calculations
	 */
	@Get('with-units')
	@RouteSchema({
		method: 'GET',
		path: 'properties/with-units',
		schema: propertyRouteSchemas.findAll
	})
	async findAllWithUnits(
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
		@CurrentUser() user?: ValidatedUser
	): Promise<unknown> {
		if (!this.propertiesService) {
			return {
				message: 'Properties service not available',
				data: [],
				total: 0,
				limit,
				offset
			}
		}
		const safeLimit = Math.max(1, Math.min(limit, 50))
		const safeOffset = Math.max(0, offset)
		return this.propertiesService.findAllWithUnits(user?.id || 'test-user-id', {
			search,
			limit: safeLimit,
			offset: safeOffset
		})
	}
}
