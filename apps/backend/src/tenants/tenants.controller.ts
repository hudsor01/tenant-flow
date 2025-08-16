import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { TenantsService } from './tenants.service'
import { Tenant } from '@repo/database'
import { 
  createTenantSchema, 
  queryTenantsSchema, 
  TenantCreateDto,
  TenantQueryDto,
  TenantUpdateDto,
  updateTenantSchema,
  uuidSchema
} from '../common/dto/dto-exports'
import { 
  ZodBody,
  ZodParam,
  ZodQuery,
  ZodValidation
} from '../common/decorators/zod-validation.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UsageLimitsGuard } from '../subscriptions/guards/usage-limits.guard'
import { UsageLimit } from '../subscriptions/decorators/usage-limits.decorator'

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard, UsageLimitsGuard)
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Post()
	@ApiOperation({ summary: 'Create a new tenant' })
	@ApiResponse({ status: 201, description: 'Tenant created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 403, description: 'Usage limit exceeded' })
	@UsageLimit({ resource: 'tenants', action: 'create' })
	@ZodBody(createTenantSchema)
	async create(
		@Body() data: TenantCreateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Tenant> {
		return await this.tenantsService.create(data, user.id)
	}

	@Get()
	@ApiOperation({ summary: 'Get tenants for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Tenants retrieved successfully' })
	@ZodQuery(queryTenantsSchema)
	async findAll(
		@Query() query: TenantQueryDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Tenant[]> {
		return await this.tenantsService.getByOwner(user.id, query)
	}

	@Get('stats')
	@ApiOperation({ summary: 'Get tenant statistics for the authenticated user' })
	@ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
	async getStats(@CurrentUser() user: ValidatedUser) {
		return await this.tenantsService.getStats(user.id)
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get a specific tenant by ID' })
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant retrieved successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@ZodParam(uuidSchema)
	async findOne(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<Tenant> {
		return await this.tenantsService.findById(id, user.id)
	}

	@Put(':id')
	@ApiOperation({ summary: 'Update a tenant' })
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@ZodValidation({
		params: uuidSchema,
		body: updateTenantSchema
	})
	async update(
		@Param('id') id: string,
		@Body() data: TenantUpdateDto,
		@CurrentUser() user: ValidatedUser
	): Promise<Tenant> {
		return await this.tenantsService.update(id, data, user.id)
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete a tenant' })
	@ApiParam({ name: 'id', description: 'Tenant ID' })
	@ApiResponse({ status: 200, description: 'Tenant deleted successfully' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@ApiResponse({ status: 409, description: 'Cannot delete tenant with active leases' })
	@ZodParam(uuidSchema)
	async remove(
		@Param('id') id: string,
		@CurrentUser() user: ValidatedUser
	): Promise<Tenant> {
		return await this.tenantsService.delete(id, user.id)
	}
}