/**
 * 🚨 ULTRA-NATIVE SERVICE - DO NOT ADD ORCHESTRATION 🚨
 *
 * DIRECT PostgreSQL RPC calls ONLY. Each method <30 lines.
 * ❌ FORBIDDEN: Service layers, repositories, business logic classes
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { SupabaseService } from '../database/supabase.service'
import type {
	CreateTenantRequest,
	UpdateTenantRequest
} from '../schemas/tenants.schema'

@Injectable()
export class TenantsService {
	private readonly logger = new Logger(TenantsService.name)

	constructor(private readonly supabaseService: SupabaseService) {}

	/**
	 * Get all tenants for a user using RPC
	 */
	async findAll(userId: string, query: Record<string, unknown>) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_tenants', {
				p_user_id: userId,
				p_search: query.search as string | undefined,
				p_invitation_status: query.invitationStatus as
					| string
					| undefined,
				p_limit: query.limit as number | undefined,
				p_offset: query.offset as number | undefined,
				p_sort_by: query.sortBy as string | undefined,
				p_sort_order: query.sortOrder as string | undefined
			})

		if (error) {
			this.logger.error('Failed to get tenants', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve tenants')
		}

		return data
	}

	/**
	 * Get tenant statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_tenant_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get tenant stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to retrieve tenant statistics'
			)
		}

		return data
	}

	/**
	 * Get single tenant using RPC
	 */
	async findOne(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_tenant_by_id', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to get tenant', {
				userId,
				tenantId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Create tenant using RPC
	 */
	async create(userId: string, createRequest: CreateTenantRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_tenant', {
				p_user_id: userId,
				p_name: createRequest.name,
				p_email: createRequest.email,
				p_phone: createRequest.phone || undefined,
				p_emergency_contact: createRequest.emergencyContact || undefined
			})
			.single()

		if (error) {
			this.logger.error('Failed to create tenant', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to create tenant')
		}

		return data
	}

	/**
	 * Update tenant using RPC
	 */
	async update(
		userId: string,
		tenantId: string,
		updateRequest: UpdateTenantRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId,
				p_name: updateRequest.name,
				p_email: updateRequest.email,
				p_phone: updateRequest.phone,
				p_emergency_contact: updateRequest.emergencyContact
			})
			.single()

		if (error) {
			this.logger.error('Failed to update tenant', {
				userId,
				tenantId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Delete tenant using RPC
	 */
	async remove(userId: string, tenantId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_tenant', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})

		if (error) {
			this.logger.error('Failed to delete tenant', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete tenant')
		}
	}

	/**
	 * Send invitation to tenant using RPC
	 */
	async sendInvitation(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('send_tenant_invitation', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to send invitation', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to send invitation')
		}

		return data
	}

	/**
	 * Resend invitation to tenant using RPC
	 */
	async resendInvitation(userId: string, tenantId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('resend_tenant_invitation', {
				p_user_id: userId,
				p_tenant_id: tenantId
			})
			.single()

		if (error) {
			this.logger.error('Failed to resend invitation', {
				userId,
				tenantId,
				error: error.message
			})
			throw new BadRequestException('Failed to resend invitation')
		}

		return data
	}
}
