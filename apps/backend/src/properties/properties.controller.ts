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
<<<<<<< HEAD
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	ParseUUIDPipe,
	ParseIntPipe,
	DefaultValuePipe,
	NotFoundException
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { UnifiedAuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import type { ValidatedUser } from '@repo/shared'
import { PropertiesService } from './properties.service'
import type {
	CreatePropertyRequest,
	UpdatePropertyRequest
} from '../schemas/properties.schema'
=======
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
>>>>>>> origin/main

/**
 * Properties controller - Simple, direct implementation
 * No base classes, no abstraction, just clean endpoints
 */
@ApiTags('properties')
@Controller('properties')
<<<<<<< HEAD
@UseGuards(ThrottlerGuard, UnifiedAuthGuard)
export class PropertiesController {
	// private readonly logger = new Logger(PropertiesController.name)
=======
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) {}
>>>>>>> origin/main

	constructor(private readonly propertiesService: PropertiesService) {}

	/**
	 * Get all properties for authenticated user
	 * Built-in pipes handle all validation
	 */
	@Get()
<<<<<<< HEAD
	async findAll(
		@CurrentUser() user: ValidatedUser,
		@Query('search', new DefaultValuePipe(null)) search: string | null,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number
	) {
		return this.propertiesService.findAll(user.id, {
			search,
			limit,
			offset
		})
=======
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
>>>>>>> origin/main
	}

	/**
	 * Get single property by ID
	 * ParseUUIDPipe validates the ID format
	 */
	@Get(':id')
<<<<<<< HEAD
	async findOne(
		@CurrentUser() user: ValidatedUser,
		@Param('id', ParseUUIDPipe) id: string
	) {
		const property = await this.propertiesService.findOne(user.id, id)
		if (!property) {
			throw new NotFoundException('Property not found')
		}
		return property
=======
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
>>>>>>> origin/main
	}

	/**
	 * Create new property
	 * JSON Schema validation via Fastify
	 */
	@Post()
<<<<<<< HEAD
	async create(
		@CurrentUser() user: ValidatedUser,
		@Body() createPropertyRequest: CreatePropertyRequest
	) {
		return this.propertiesService.create(user.id, createPropertyRequest)
=======
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
>>>>>>> origin/main
	}

	/**
	 * Update existing property
	 * Combination of UUID validation and JSON Schema
	 */
	@Put(':id')
<<<<<<< HEAD
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
=======
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
>>>>>>> origin/main
	}

	/**
	 * Delete property
	 * Simple and direct with built-in validation
	 */
	@Delete(':id')
<<<<<<< HEAD
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
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.propertiesService.getStats(user.id)
	}
=======
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
>>>>>>> origin/main
}
