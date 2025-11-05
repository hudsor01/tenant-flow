import {
	Controller,
	Get,
	Post,
	Body,
	UseGuards,
	Logger,
	HttpCode,
	HttpStatus
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { RolesGuard } from '../../shared/guards/roles.guard'
import { Roles } from '../../shared/decorators/roles.decorator'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { User } from '../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'
import type { Database } from '@repo/shared/types/supabase-generated'
import { SupabaseService } from '../../database/supabase.service'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// DTOs for tenant portal endpoints
const CreateMaintenanceRequestSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().min(1).max(2000),
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	category: z.string().optional()
})

class CreateMaintenanceRequestDto extends createZodDto(
	CreateMaintenanceRequestSchema
) {}

/**
 * Tenant Portal Controller
 *
 * Dedicated endpoints for tenant-only operations with role-based access control.
 * Enforces TENANT role via @Roles() decorator and RolesGuard.
 *
 * Security: Defense in depth
 * - Application Layer: @Roles('TENANT') + RolesGuard
 * - Database Layer: RLS policies enforce auth.uid() = tenantId
 */
@Controller('tenant-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TENANT')
export class TenantPortalController {
	private readonly logger = new Logger(TenantPortalController.name)

	constructor(private readonly supabase: SupabaseService) {}

	/**
	 * Get the authenticated tenant's current active lease with property and unit details
	 * RLS ensures tenant can only see their own lease data
	 */
	@Get('my-lease')
	async getMyLease(@JwtToken() token: string, @User() user: authUser) {
		const userId = user.id

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('lease')
			.select(
				`
				id,
				startDate,
				endDate,
				rentAmount,
				securityDeposit,
				status,
				leaseType,
				unitId,
				tenantId,
				createdAt,
				updatedAt,
				unit:unit!inner(
					id,
					unitNumber,
					bedrooms,
					bathrooms,
					squareFeet,
					property:property!inner(
						id,
						name,
						address,
						city,
						state,
						zipCode,
						propertyType
					)
				)
				`
			)
			.eq('tenantId', userId)
			.eq('status', 'ACTIVE')
			.single()

		if (error) {
			this.logger.error('Failed to fetch tenant lease', {
				userId,
				error: error.message
			})
			throw new Error('Failed to fetch lease information')
		}

		return data
	}

	/**
	 * Get the tenant's assigned unit details
	 * RLS ensures tenant can only see their assigned unit
	 */
	@Get('my-unit')
	async getMyUnit(@JwtToken() token: string, @User() user: authUser) {
		const userId = user.id

		// First get the active lease to find unitId
		const { data: lease, error: leaseError } = await this.supabase
			.getUserClient(token)
			.from('lease')
			.select('unitId')
			.eq('tenantId', userId)
			.eq('status', 'ACTIVE')
			.single()

		if (leaseError || !lease) {
			this.logger.warn('Tenant has no active lease', { userId })
			return null
		}

		const { data: unit, error: unitError } = await this.supabase
			.getUserClient(token)
			.from('unit')
			.select('id, unitNumber, bedrooms, bathrooms, squareFeet, status, propertyId')
			.eq('id', lease.unitId!)
			.single()

		if (unitError) {
			this.logger.error('Failed to fetch tenant unit', {
				userId,
				unitId: lease.unitId,
				error: unitError.message
			})
			throw new Error('Failed to fetch unit information')
		}

		return unit
	}

	/**
	 * Get all maintenance requests created by the authenticated tenant
	 * RLS ensures tenant can only see requests they created
	 */
	@Get('my-maintenance-requests')
	async getMyMaintenanceRequests(
		@JwtToken() token: string,
		@User() user: authUser
	) {
		const userId = user.id

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.select(
				'id, title, description, priority, status, category, createdAt, updatedAt, completedAt, requestedBy'
			)
			.eq('requestedBy', userId)
			.order('createdAt', { ascending: false })

		if (error) {
			this.logger.error('Failed to fetch tenant maintenance requests', {
				userId,
				error: error.message
			})
			throw new Error('Failed to fetch maintenance requests')
		}

		// Calculate stats
		const requests = data || []
		const total = requests.length
		const open = requests.filter(r => r.status === 'OPEN').length
		const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length
		const completed = requests.filter(r => r.status === 'COMPLETED').length

		return {
			requests,
			total,
			open,
			inProgress,
			completed
		}
	}

	/**
	 * Create a new maintenance request for the tenant's unit
	 * RLS ensures request is created with proper tenant isolation
	 */
	@Post('my-maintenance-requests')
	@HttpCode(HttpStatus.CREATED)
	async createMaintenanceRequest(
		@Body() body: CreateMaintenanceRequestDto,
		@JwtToken() token: string,
		@User() user: authUser
	) {
		const userId = user.id

		// Get tenant's active lease to find unitId
		const { data: lease, error: leaseError } = await this.supabase
			.getUserClient(token)
			.from('lease')
			.select('unitId')
			.eq('tenantId', userId)
			.eq('status', 'ACTIVE')
			.single()

		if (leaseError || !lease) {
			this.logger.warn(
				'Tenant attempted to create maintenance request without active lease',
				{
					userId
				}
			)
			throw new Error(
				'No active lease found. Cannot create maintenance request.'
			)
		}

		const maintenanceRequest: Database['public']['Tables']['maintenance_request']['Insert'] = {
			title: body.title,
			description: body.description,
			priority: body.priority as Database['public']['Enums']['Priority'],
			category: body.category || null,
			unitId: lease.unitId!,
			status: 'OPEN',
			requestedBy: userId,
			allowEntry: true
		}

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('maintenance_request')
			.insert(maintenanceRequest)
			.select()
			.single()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				userId,
				unitId: lease.unitId,
				error: error.message
			})
			throw new Error('Failed to create maintenance request')
		}

		this.logger.log('Tenant created maintenance request', {
			userId,
			requestId: data.id,
			unitId: lease.unitId,
			priority: body.priority
		})

		return data
	}

	/**
	 * Get tenant's rent payment information
	 * RLS ensures tenant can only see their own payment data
	 */
	@Get('my-payments')
	async getMyPayments(@JwtToken() token: string, @User() user: authUser) {
		const userId = user.id

		const { data, error } = await this.supabase
			.getUserClient(token)
			.from('rent_payment')
			.select('id, amount, status, paidAt, dueDate, createdAt, leaseId, tenantId')
			.eq('tenantId', userId)
			.order('dueDate', { ascending: false })
			.limit(50)

		if (error) {
			this.logger.error('Failed to fetch tenant payments', {
				userId,
				error: error.message
			})
			throw new Error('Failed to fetch payment information')
		}

		return data || []
	}
}
