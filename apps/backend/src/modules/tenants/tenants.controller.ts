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
	Req
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import type { ListFilters, LeaseHistoryItem } from './tenant-query.service'
import { TenantQueryService } from './tenant-query.service'
import { TenantCrudService } from './tenant-crud.service'
import { TenantBulkOperationsService } from './tenant-bulk-operations.service'
import { TenantNotificationPreferencesService } from './tenant-notification-preferences.service'
import { CreateTenantDto } from './dto/create-tenant.dto'
import { UpdateTenantDto } from './dto/update-tenant.dto'
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto'

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

		const data = propertyId
			? await this.queryService.findByProperty(
					user_id,
					propertyId,
					filters as ListFilters
				)
			: await this.queryService.findAllWithLeaseInfo(
					user_id,
					filters as Omit<ListFilters, 'status'>
				)

		return {
			data,
			total: data.length
		}
	}

	@Get('stats')
	async getStats(@Req() req: AuthenticatedRequest) {
		const user_id = req.user.id
		return this.queryService.getStats(user_id)
	}

	@Get('summary')
	async getSummary(@Req() req: AuthenticatedRequest) {
		const user_id = req.user.id
		return this.queryService.getSummary(user_id)
	}

	@Get(':id/with-lease')
	async findOneWithLease(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		const tenantWithLease = await this.queryService.findOneWithLease(id, token)
		if (!tenantWithLease) {
			throw new NotFoundException('Tenant not found')
		}
		return tenantWithLease
	}

	@Get(':id')
	async findOne(
		@Param('id', ParseUUIDPipe) id: string,
		@JwtToken() token: string
	) {
		const tenant = await this.queryService.findOne(id, token)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Get(':id/leases')
	async getLeaseHistory(
		@Param('id', ParseUUIDPipe) id: string
	): Promise<{ leases: LeaseHistoryItem[] }> {
		const leases = await this.queryService.getTenantLeaseHistory(id)
		return { leases }
	}

	// ========================================
	// CRUD Endpoints
	// ========================================

	@Post()
	async create(
		@Body() dto: CreateTenantDto,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const user_id = req.user.id
		const tenant = await this.crudService.create(user_id, dto, token)
		return tenant
	}

	@Put(':id')
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateTenantDto,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const user_id = req.user.id
		const tenant = await this.crudService.update(user_id, id, dto, token)
		if (!tenant) {
			throw new NotFoundException('Tenant not found')
		}
		return tenant
	}

	@Delete(':id/hard-delete')
	async hardDelete(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const user_id = req.user.id
		await this.crudService.hardDelete(user_id, id, token)
		return { message: 'Tenant permanently deleted' }
	}

	@Delete(':id')
	async remove(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		const user_id = req.user.id
		await this.crudService.softDelete(user_id, id, token)
	}

	// ========================================
	// Bulk Operations
	// ========================================

	@Post('bulk-update')
	async bulkUpdate(
		@Body() body: { updates: Array<{ id: string; data: UpdateTenantDto }> },
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		if (!body.updates || !Array.isArray(body.updates)) {
			throw new BadRequestException('updates array is required')
		}

		if (body.updates.length === 0) {
			throw new BadRequestException('updates array cannot be empty')
		}

		if (body.updates.length > 100) {
			throw new BadRequestException(
				'Cannot update more than 100 tenants at once'
			)
		}

		const user_id = req.user.id
		return this.bulkOperationsService.bulkUpdate(user_id, body.updates, token)
	}

	@Delete('bulk-delete')
	async bulkDelete(
		@Body() body: { ids: string[] },
		@Req() req: AuthenticatedRequest,
		@JwtToken() token: string
	) {
		if (!body.ids || !Array.isArray(body.ids)) {
			throw new BadRequestException('ids array is required')
		}

		if (body.ids.length === 0) {
			throw new BadRequestException('ids array cannot be empty')
		}

		if (body.ids.length > 100) {
			throw new BadRequestException(
				'Cannot delete more than 100 tenants at once'
			)
		}

		const user_id = req.user.id
		return this.bulkOperationsService.bulkDelete(user_id, body.ids, token)
	}

	// ========================================
	// Notification Preferences
	// ========================================

	@Get(':id/notification-preferences')
	async getNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id
		const preferences =
			await this.notificationPreferencesService.getPreferences(user_id, id)
		if (!preferences) {
			throw new NotFoundException('Tenant not found')
		}
		return preferences
	}

	@Put(':id/notification-preferences')
	async updateNotificationPreferences(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateNotificationPreferencesDto,
		@Req() req: AuthenticatedRequest
	) {
		const user_id = req.user.id

		const result = await this.notificationPreferencesService.updatePreferences(
			user_id,
			id,
			dto as Record<string, boolean>
		)
		if (!result) {
			throw new NotFoundException('Tenant not found')
		}
		return result
	}
}
