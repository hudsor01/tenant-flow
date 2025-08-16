import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { PropertiesService } from './properties.service'
import { Property } from '@repo/database'
import { 
  CreatePropertyDto, 
  createPropertySchema, 
  QueryPropertiesDto,
  queryPropertiesSchema,
  UpdatePropertyDto,
  updatePropertySchema,
  uuidSchema
} from '../common/validation/zod-schemas'
import { 
  ZodBody,
  ZodParam,
  ZodQuery,
  ZodValidation
} from '../common/decorators/zod-validation.decorator'
import type { ValidatedUser } from '../auth/auth.service'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UseGuards } from '@nestjs/common'

@ApiTags('properties')
@Controller('properties')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class PropertiesController {
	constructor(private readonly propertiesService: PropertiesService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new property' })
	@ApiResponse({ status: 201, description: 'Property created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'properties', action: 'create' })
	@ZodBody(createPropertySchema)
	async create(
		@Body() data: CreatePropertyDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Property> {
		return await this.propertiesService.create(data, user.id)
	}

	@Get()
	@ApiOperation({ summary: 'Get properties for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Properties retrieved successfully' })
	@ZodQuery(queryPropertiesSchema)
	async findAll(
		@Query() query: QueryPropertiesDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Property[]> {
		return await this.propertiesService.getByOwner(user.id, query)
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get property statistics for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return await this.propertiesService.getStats(user.id)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific property by ID' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@ZodParam(uuidSchema)
	async findOne(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<Property> {
		return await this.propertiesService.getById(id, user.id)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@ZodValidation({
		params: uuidSchema,
		body: updatePropertySchema
	})
	async update(
		@Param('id') id: string,
		@Body() data: UpdatePropertyDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Property> {
		return await this.propertiesService.update(id, data, user.id)
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a property' })
	@ApiParam({ name: 'id', description: 'Property ID' })
	@ApiResponse({ status: 200, description: 'Property deleted successfully' })
	@ApiResponse({ status: 404, description: 'Property not found' })
	@ApiResponse({ status: 409, description: 'Cannot delete property with active leases' })
	@ZodParam(uuidSchema)
	async remove(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<Property> {
		return await this.propertiesService.delete(id, user.id)
	}
}