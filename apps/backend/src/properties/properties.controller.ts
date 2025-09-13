/**
 * Properties Controller - Ultra-Native Implementation
 *
 * Uses:
 * - Fastify JSON Schema validation (no DTOs)
 * - Built-in NestJS pipes for validation
 * - Native exception handling
 * - Direct PostgreSQL RPC calls
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
	Query,
	UseGuards,
	ParseIntPipe,
	DefaultValuePipe,
	NotFoundException,
	BadRequestException
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { Public } from '../shared/decorators/public.decorator'
import type { ValidatedUser } from '@repo/shared'
import { PropertiesService } from './properties.service'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '../schemas/properties.schema'

/**
 * Properties controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('properties')
@Controller('properties')
@UseGuards(ThrottlerGuard, AuthGuard)
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) {}

	/**
	 * Get all properties for authenticated user
	 * Built-in pipes handle all validation
	 */
	@Get()
	@Public()
	async findAll(
		@CurrentUser() user: ValidatedUser | undefined,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
	) {
		return this.propertiesService.findAll(user?.id || 'test-user-id', {
			search,
			limit,
			offset
		})
	}

	/**
	 * Get single property by ID
	 * ParseUUIDPipe validates the ID format
	 */
	@Get(':id')
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const property = await this.propertiesService.findOne(user.id, id)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
	}

	/**
	 * Create new property
	 * JSON Schema validation via Fastify
	 */
	@Post()
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createPropertyRequest: CreatePropertyRequest
	) {
		return this.propertiesService.create(user.id, createPropertyRequest)
	}

	/**
	 * Update existing property
	 * Combination of UUID validation and JSON Schema
	 */
	@Put(':id')
	async update(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string,
		@Body() updatePropertyRequest: UpdatePropertyRequest
	) {
		const property = await this.propertiesService.update(
			user.id,
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
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		await this.propertiesService.remove(user.id, id)
		return { message: 'Property deleted successfully' }
	}

	/**
	 * Get property statistics
	 * Direct RPC call for aggregated data
	 */
	@Get('stats')
	@Public()
	async getStats(@CurrentUser() user?: ValidatedUser) {
		return this.propertiesService.getStats(user?.id || 'test-user-id')
	}

	/**
	 * Get per-property analytics and performance metrics
	 * Returns detailed metrics for each property
	 */
	@Get('analytics/performance')
	@Public()
	async getPropertyPerformanceAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('30d')) timeframe?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}
		
		// Validate timeframe
		if (!['7d', '30d', '90d', '1y'].includes(timeframe ?? '30d')) {
			throw new BadRequestException('Invalid timeframe. Must be one of: 7d, 30d, 90d, 1y')
		}

		return this.propertiesService.getPropertyPerformanceAnalytics(user?.id || 'test-user-id', {
			propertyId,
			timeframe: timeframe ?? '30d',
			limit
		})
	}

	/**
	 * Get property occupancy trends and analytics
	 * Tracks occupancy rates over time per property
	 */
	@Get('analytics/occupancy')
	@Public()
	async getPropertyOccupancyAnalytics(
		@CurrentUser() user?: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('period', new DefaultValuePipe('monthly')) period?: string
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate period
		if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period ?? 'monthly')) {
			throw new BadRequestException('Invalid period. Must be one of: daily, weekly, monthly, yearly')
		}

		return this.propertiesService.getPropertyOccupancyAnalytics(user?.id || 'test-user-id', {
			propertyId,
			period: period ?? 'monthly'
		})
	}

	/**
	 * Get property financial analytics
	 * Revenue, expenses, and profitability per property
	 */
	@Get('analytics/financial')
	async getPropertyFinancialAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('12m')) timeframe?: string
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['3m', '6m', '12m', '24m'].includes(timeframe ?? '12m')) {
			throw new BadRequestException('Invalid timeframe. Must be one of: 3m, 6m, 12m, 24m')
		}

		return this.propertiesService.getPropertyFinancialAnalytics(user.id, {
			propertyId,
			timeframe: timeframe ?? '12m'
		})
	}

	/**
	 * Get property maintenance analytics
	 * Maintenance costs, frequency, and trends per property
	 */
	@Get('analytics/maintenance')
	async getPropertyMaintenanceAnalytics(
		@CurrentUser() user: ValidatedUser,
		@Query('propertyId') propertyId?: string,
		@Query('timeframe', new DefaultValuePipe('6m')) timeframe?: string
	) {
		// Validate propertyId if provided
		if (propertyId && !propertyId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			throw new BadRequestException('Invalid property ID')
		}

		// Validate timeframe
		if (!['1m', '3m', '6m', '12m'].includes(timeframe ?? '6m')) {
			throw new BadRequestException('Invalid timeframe. Must be one of: 1m, 3m, 6m, 12m')
		}

		return this.propertiesService.getPropertyMaintenanceAnalytics(user.id, {
			propertyId,
			timeframe: timeframe ?? '6m'
		})
	}

	/**
	 * Get all properties with their units
	 * Returns properties with units for frontend stat calculations
	 */
	@Get('with-units')
	async findAllWithUnits(
		@CurrentUser() user: ValidatedUser,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
	): Promise<unknown> {
		return this.propertiesService.findAllWithUnits(user.id, {
			search,
			limit,
			offset
		})
	}
}
