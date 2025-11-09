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
import type { Database } from '@repo/shared/types/supabase-generated'
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
	Database['public']['Tables']['maintenance_request']['Row']

/**
 * Tenant Maintenance Controller
 *
 * Handles maintenance request submission and history for tenants.
 * Enforces TENANT role via TenantAuthGuard.
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

		if (!lease?.unitId) {
			this.logger.warn(
				'Tenant attempted to create maintenance request without active unit',
				{ authUserId: user.id }
			)
			throw new BadRequestException(
				'No active lease unit found. Cannot create maintenance request.'
			)
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_request']['Insert'] =
			{
				title: body.title,
				description: body.description,
				priority: body.priority as Database['public']['Enums']['Priority'],
				category: body.category ?? null,
				allowEntry: body.allowEntry,
				status: 'OPEN',
				requestedBy: user.id,
				photos: body.photos && body.photos.length > 0 ? body.photos : null,
				unitId: lease.unitId
			}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.insert(maintenanceRequest)
			.select()
			.single<MaintenanceRequestRow>()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				authUserId: user.id,
				unitId: lease.unitId,
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
			.from('tenant')
			.select('id, auth_user_id')
			.eq('auth_user_id', user.id)
			.single()

		if (error || !data) {
			throw new Error('Tenant account not found')
		}

		return data
	}

	private async fetchActiveLease(token: string, tenantId: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('lease')
			.select('id, unitId')
			.eq('tenantId', tenantId)
			.eq('status', 'ACTIVE')
			.order('startDate', { ascending: false })
			.limit(1)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to load active lease', {
				tenantId,
				error: error.message
			})
			return null
		}

		return data
	}

	private async fetchMaintenanceRequests(token: string, authUserId: string) {
		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.select(
				'id, title, description, priority, status, category, createdAt, updatedAt, completedAt, requestedBy, unitId'
			)
			.eq('requestedBy', authUserId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch maintenance requests', {
				authUserId,
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
