/**
 * Tenants Controller - Core CRUD Operations
 *
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 * ONLY built-in NestJS pipes, native exceptions, direct RPC calls.
 * FORBIDDEN: Custom decorators, DTOs, validation layers, middleware
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 *
 * Related Controllers (extracted for CLAUDE.md compliance):
 * - TenantInvitationController: Invitation management
 * - TenantEmergencyContactController: Emergency contact CRUD
 * - TenantPaymentController: Payment history and reminders
 */

import {
	BadRequestException,
	Body,
	Controller,
	DefaultValuePipe,
	Delete,
	Get,
	NotFoundException,
	Param,
	ParseIntPipe,
	ParseUUIDPipe,
	Post,
	Put,
	Query,
	Req,
	UnauthorizedException
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import type { ListFilters } from './tenant-list.service'
import type { LeaseHistoryItem } from './tenant-relation.service'
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantBulkOperationsService } from './tenant-bulk-operations.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto'
import { BulkDeleteTenantsDto } from './dto/bulk-delete-tenants.dto'
import { BulkUpdateTenantsDto } from './dto/bulk-update-tenants.dto'

@ApiTags('Tenants')
@ApiBearerAuth('supabase-auth')
@Controller('tenants')
export class TenantsController {
	constructor(
		private readonly queryService: TenantQueryService,
		private readonly crudService: TenantCrudService,
		private readonly bulkOperationsService: TenantBulkOperationsService,
		private readonly notificationPreferencesService: TenantNotificationPreferencesService
	) {}

	// ========================================
	// Query Endpoints
	// ========================================

	@ApiOperation({ summary: 'List all tenants', description: 'Get all tenants with filtering and pagination' })
	@ApiQuery({ name: 'search', required: false, description: 'Search by name or email' })
	@ApiQuery({ name: 'invitationStatus', required: false, enum: ['pending', 'sent', 'accepted', 'expired', 'cancelled'], description: 'Filter by invitation status' })
	@ApiQuery({ name: 'property_id', required: false, description: 'Filter by property UUID' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (1-50)', example: 10 })
	@ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset', example: 0 })
	@ApiResponse({ status: 200, description: 'List of tenants' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async findAll(
		@Req() req: AuthenticatedRequest,
		@Query('search') search?: string,
		@Query('invitationStatus') invitationStatus?: string,
		@Query('property_id') propertyId?: string,
		@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
		@Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number
	) {
		if (limit !== undefined && (limit < 1 || limit > 50)) {
			throw new BadRequestException('Limit must be between 1 and 50')
		}

		if (
			invitationStatus &&
			!['pending', 'sent', 'accepted', 'expired', 'cancelled'].includes(
				invitationStatus
			)
		) {
			throw new BadRequestException('Invalid invitation status')
		}

		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '') ?? undefined
		const filters: Record<string, unknown> = { token }
		if (search !== undefined) filters.search = search
		if (invitationStatus !== undefined)
			filters.invitationStatus = invitationStatus
		if (propertyId !== undefined) filters.property_id = propertyId
		if (limit !== undefined) filters.limit = limit
		if (offset !== undefined) filters.offset = offset

		const result = propertyId
			? await this.queryService.findByProperty(
					user_id,
					propertyId,
					filters as ListFilters
				)
			: await this.queryService.findAllWithLeaseInfo(
					user_id,
					filters as Omit<ListFilters, 'status'>
				)

		// Use count from service for accurate pagination totals
		return {
			data: result.data,
			total: result.count
		}
	}

	@ApiOperation({ summary: 'Get tenant statistics', description: 'Returns aggregated tenant stats' })
	@ApiResponse({ status: 200, description: 'Tenant statistics' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('stats')
	async getStats(@Req() req: AuthenticatedRequest) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.queryService.getStats(user_id, token)
	}

	@ApiOperation({ summary: 'Get tenant summary', description: 'Returns tenant summary data' })
	@ApiResponse({ status: 200, description: 'Tenant summary' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get('summary')
	async getSummary(@Req() req: AuthenticatedRequest) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		return this.queryService.getSummary(user_id, token)
	}

	@ApiOperation({ summary: 'Get tenant with lease info', description: 'Get a tenant with their current lease information' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Tenant with lease info' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Get(':id/with-lease')
	async findOneWithLease(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const tenantWithLease = await this.queryService.findOneWithLease(id, token)
		if (!tenantWithLease) {
			throw new NotFoundException('Tenant not found')
		}
		return tenantWithLease
	}

	@ApiOperation({ summary: 'Get tenant by ID', description: 'Get a single tenant by their UUID' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Tenant details' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const tenant = await this.queryService.findOne(id, token)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@ApiOperation({ summary: 'Get tenant lease history', description: 'Get all leases for a tenant' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Tenant lease history' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get(':id/leases')
	async getLeaseHistory(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	): Promise<{ leases: LeaseHistoryItem[] }> {
		const user_id = req.user.id
		const leases = await this.queryService.getTenantLeaseHistory(id, user_id)
		return { leases }
	}

	// ========================================
	// CRUD Endpoints
	// ========================================

	@ApiOperation({ summary: 'Create tenant', description: 'Create a new tenant' })
	@ApiBody({ type: CreateTenantDto })
	@ApiResponse({ status: 201, description: 'Tenant created successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post()
	async create(
		@Body() dto: CreateTenantDto,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		const tenant = await this.crudService.create(user_id, dto, token)
		return tenant
	}

	@ApiOperation({ summary: 'Update tenant', description: 'Update an existing tenant by ID' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiBody({ type: UpdateTenantDto })
	@ApiResponse({ status: 200, description: 'Tenant updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateTenantDto,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		const tenant = await this.crudService.update(user_id, id, dto, token)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	// ========================================
	// Bulk Operations (MUST come before :id routes to prevent shadowing)
	// ========================================

	@ApiOperation({ summary: 'Bulk update tenants', description: 'Update multiple tenants at once (max 100)' })
	@ApiBody({ description: 'Array of tenant updates', schema: { type: 'object', properties: { updates: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, data: { type: 'object' } } } } } } })
	@ApiResponse({ status: 200, description: 'Tenants updated successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Post('bulk-update')
	async bulkUpdate(
		@Body() body: BulkUpdateTenantsDto,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		return this.bulkOperationsService.bulkUpdate(user_id, body.updates, token)
	}

	@ApiOperation({ summary: 'Bulk delete tenants', description: 'Delete multiple tenants at once (max 100)' })
	@ApiBody({ description: 'Array of tenant IDs to delete', schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
	@ApiResponse({ status: 200, description: 'Tenants deleted successfully' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Delete('bulk-delete')
	async bulkDelete(
		@Body() body: BulkDeleteTenantsDto,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		return this.bulkOperationsService.bulkDelete(user_id, body.ids, token)
	}

	@ApiOperation({ summary: 'Hard delete tenant', description: 'Permanently delete a tenant and all associated data' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Tenant permanently deleted' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Delete(':id/hard-delete')
	async hardDelete(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		await this.crudService.hardDelete(user_id, id, token)
		return { message: 'Tenant permanently deleted' }
	}

	@ApiOperation({ summary: 'Delete tenant', description: 'Soft delete a tenant' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Tenant deleted' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const user_id = req.user.id
		await this.crudService.softDelete(user_id, id, token)
	}

	// ========================================
	// Notification Preferences
	// ========================================

	@ApiOperation({ summary: 'Get notification preferences', description: 'Get notification preferences for a tenant' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiResponse({ status: 200, description: 'Notification preferences' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Get(':id/notification-preferences')
	async getNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const preferences =
			await this.notificationPreferencesService.getPreferences(user_id, id, token)
		if (!preferences) {
			throw new NotFoundException('Tenant not found')
		}
		return preferences
	}

	@ApiOperation({ summary: 'Update notification preferences', description: 'Update notification preferences for a tenant' })
	@ApiParam({ name: 'id', type: String, description: 'Tenant UUID' })
	@ApiBody({ type: UpdateNotificationPreferencesDto })
	@ApiResponse({ status: 200, description: 'Notification preferences updated' })
	@ApiResponse({ status: 400, description: 'Validation error' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 404, description: 'Tenant not found' })
	@Put(':id/notification-preferences')
	async updateNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateNotificationPreferencesDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}

		const result = await this.notificationPreferencesService.updatePreferences(
			user_id,
			id,
			dto as Record<string, boolean>,
			token
		)
		if (!result) {
			throw new NotFoundException('Tenant not found')
		}
		return result
	}
}
