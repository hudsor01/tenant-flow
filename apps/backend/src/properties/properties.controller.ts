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
	NotFoundException
} from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../shared/guards/auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
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
	async getStats(@CurrentUser() user: ValidatedUser) {
		return this.propertiesService.getStats(user.id)
	}
}
