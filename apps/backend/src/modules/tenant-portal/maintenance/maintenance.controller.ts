import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	NotFoundException,
	Post,
	Request,
	UnauthorizedException,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import type { AuthenticatedRequest } from '../../../shared/types/express-request.types'
import type { AuthUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'
import { AppLogger } from '../../../logger/app-logger.service'

const MaintenanceRequestCreateSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	priority: z.enum(['low', 'medium', 'high', 'urgent']),
	category: z
		.enum([
			'PLUMBING',
			'ELECTRICAL',
			'HVAC',
			'APPLIANCES',
			'SAFETY',
			'GENERAL',
			'OTHER'
		])
		.optional(),
	allowEntry: z.boolean().default(true),
	photos: z.array(z.string().url()).max(6).optional()
})

class MaintenanceRequestCreateDto extends createZodDto(
	MaintenanceRequestCreateSchema
) {}

type MaintenanceRequestRow =
	Database['public']['Tables']['maintenance_requests']['Row']

/**
 * Tenant Maintenance Controller
 *
 * Handles maintenance request submission and history for tenants.
 * Enforces TENANT user_type via TenantAuthGuard.
 *
 * Routes: /tenant/maintenance/*
 */
@ApiTags('Tenant Portal - Maintenance')
@ApiBearerAuth('supabase-auth')
@Controller()
@UseGuards(TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantMaintenanceController {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get maintenance request history
	 *
	 * @returns List of maintenance requests with summary stats
	 */
	@ApiOperation({ summary: 'Get maintenance requests', description: 'Get maintenance request history with summary statistics' })
	@ApiResponse({ status: 200, description: 'Maintenance requests retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized - tenant authentication required' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Get()
	async getMaintenance(@Request() req: AuthenticatedRequest) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const requests = await this.fetchMaintenanceRequests(token, req.user.id)
		const summary = this.calculateMaintenanceStats(requests)

		return { requests, summary }
	}

	/**
	 * Create a maintenance request
	 *
	 * @param body Request details
	 * @returns Created maintenance request
	 */
	@ApiOperation({ summary: 'Create maintenance request', description: 'Submit a new maintenance request for the tenant\'s unit' })
	@ApiBody({ schema: { type: 'object', required: ['title', 'description', 'priority'], properties: { title: { type: 'string', maxLength: 200 }, description: { type: 'string', maxLength: 2000 }, priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] }, category: { type: 'string', enum: ['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCES', 'SAFETY', 'GENERAL', 'OTHER'] }, allowEntry: { type: 'boolean', default: true }, photos: { type: 'array', items: { type: 'string' }, maxItems: 6 } } } })
	@ApiResponse({ status: 201, description: 'Maintenance request created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input or no active lease' })
	@ApiResponse({ status: 401, description: 'Unauthorized - tenant authentication required' })
	@ApiResponse({ status: 500, description: 'Internal server error' })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createMaintenanceRequest(
		@Body() body: MaintenanceRequestCreateDto,
		@Request() req: AuthenticatedRequest
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token) {
			throw new UnauthorizedException('Authorization token required')
		}
		const tenant = await this.resolveTenant(token, req.user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease?.unit_id) {
			this.logger.warn(
				'Tenant attempted to create maintenance request without active unit',
				{ authuser_id: req.user.id }
			)
			throw new BadRequestException(
				'No active lease unit found. Cannot create maintenance request.'
			)
		}

		const ownerUserId = lease.unit?.property?.owner_user_id
		if (!ownerUserId) {
			throw new BadRequestException('Unable to find property owner for unit')
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_requests']['Insert'] =
			{
				title: body.title,
				description: body.description,
				priority: body.priority,
				status: 'open',
				requested_by: req.user.id,
				tenant_id: tenant.id,
				unit_id: lease.unit_id,
				owner_user_id: ownerUserId
			}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.insert(maintenanceRequest)
			.select()
			.single<MaintenanceRequestRow>()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				authuser_id: req.user.id,
				unit_id: lease.unit_id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to create maintenance request'
			)
		}

		return data
	}

	private async resolveTenant(token: string, user: AuthUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id')
			.eq('user_id', user.id)
			.single()

		if (error || !data) {
			throw new NotFoundException('Tenant account not found')
		}

		return data
	}

	private async fetchActiveLease(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select(
				`
				id,
				unit_id,
				unit:units!leases_unit_id_fkey(
					id,
					property:property_id(owner_user_id)
				)
				`
			)
			.eq('tenant_id', tenant_id)
			.eq('status', 'active')
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load active lease', {
				tenant_id,
				error: error.message
			})
			return null
		}

		return data
	}

	private async fetchMaintenanceRequests(token: string, authuser_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.select(
				'id, description, priority, status, created_at, updated_at, completed_at, requested_by, unit_id'
			)
			.eq('requested_by', authuser_id)
			.order('created_at', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch maintenance requests', {
				authuser_id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to load maintenance requests'
			)
		}

		return (data ?? []) as MaintenanceRequestRow[]
	}

	private calculateMaintenanceStats(requests: MaintenanceRequestRow[]) {
		const total = requests.length
		const open = requests.filter(r => r.status === 'open').length
		const inProgress = requests.filter(r => r.status === 'in_progress').length
		const completed = requests.filter(r => r.status === 'completed').length

		return { total, open, inProgress, completed }
	}
}
