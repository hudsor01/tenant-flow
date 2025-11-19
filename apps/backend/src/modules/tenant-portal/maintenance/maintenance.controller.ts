import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
	Logger,
	Post,
	UseGuards,
	UseInterceptors
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../../shared/decorators/jwt-token.decorator'
import { User } from '../../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'

const CreateMaintenanceRequestSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	category: z
		.enum(['PLUMBING', 'ELECTRICAL', 'HVAC', 'APPLIANCES', 'SAFETY', 'GENERAL', 'OTHER'])
		.optional(),
	allowEntry: z.boolean().default(true),
	photos: z.array(z.string().url()).max(6).optional()
})

class CreateMaintenanceRequestDto extends createZodDto(
	CreateMaintenanceRequestSchema
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
@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantMaintenanceController {
	private readonly logger = new Logger(TenantMaintenanceController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get maintenance request history
	 *
	 * @returns List of maintenance requests with summary stats
	 */
	@Get()
	async getMaintenance(@JwtToken() token: string, @User() user: authUser) {
		const requests = await this.fetchMaintenanceRequests(token, user.id)
		const summary = this.calculateMaintenanceStats(requests)

		return { requests, summary }
	}

	/**
	 * Create a maintenance request
	 *
	 * @param body Request details
	 * @returns Created maintenance request
	 */
	@Post()
	@HttpCode(HttpStatus.CREATED)
	async createMaintenanceRequest(
		@Body() body: CreateMaintenanceRequestDto,
		@JwtToken() token: string,
		@User() user: authUser
	) {
		const tenant = await this.resolveTenant(token, user)
		const lease = await this.fetchActiveLease(token, tenant.id)

		if (!lease?.unit_id) {
			this.logger.warn(
				'Tenant attempted to create maintenance request without active unit',
				{ authuser_id: user.id }
			)
			throw new BadRequestException(
				'No active lease unit found. Cannot create maintenance request.'
			)
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_requests']['Insert'] =
			{
				description: body.description,
				priority: body.priority,
				status: 'OPEN',
				requested_by: user.id,
				tenant_id: tenant.id,
				unit_id: lease.unit_id
			}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_requests')
			.insert(maintenanceRequest)
			.select()
			.single<MaintenanceRequestRow>()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				authuser_id: user.id,
				unit_id: lease.unit_id,
				error: error.message
			})
			throw new InternalServerErrorException(
				'Failed to create maintenance request'
			)
		}

		return data
	}

	private async resolveTenant(token: string, user: authUser) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('tenants')
			.select('id, user_id')
			.eq('user_id', user.id)
			.single()

		if (error || !data) {
			throw new Error('Tenant account not found')
		}

		return data
	}

	private async fetchActiveLease(token: string, tenant_id: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('leases')
			.select('id, unit_id')
			.eq('tenant_id', tenant_id)
			.eq('status', 'ACTIVE')
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
		const open = requests.filter(r => r.status === 'OPEN').length
		const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
		const completed = requests.filter(r => r.status === 'COMPLETED').length

		return { total, open, inProgress, completed }
	}
}
