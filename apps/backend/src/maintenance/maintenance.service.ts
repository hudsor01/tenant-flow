/**
 *  ULTRA-NATIVE SERVICE - DO NOT ADD ORCHESTRATION
 *
 * DIRECT PostgreSQL RPC calls ONLY. Each method <30 lines.
 * FORBIDDEN: Service layers, repositories, business logic classes
 * See: apps/backend/ULTRA_NATIVE_ARCHITECTURE.md
 */

import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	CreateMaintenanceRequest,
	UpdateMaintenanceRequest
} from '@repo/shared'
import { SupabaseService } from '../database/supabase.service'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'

@Injectable()
export class MaintenanceService {
	private readonly logger = new Logger(MaintenanceService.name)

	constructor(
		private readonly supabaseService: SupabaseService,
		private readonly eventEmitter: EventEmitter2
	) {}

	/**
	 * Get all maintenance requests for a user using RPC
	 */
	async findAll(userId: string, query: Record<string, unknown>) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_user_maintenance', {
				p_user_id: userId,
				p_unit_id: query.unitId as string | undefined,
				p_property_id: query.propertyId as string | undefined,
				p_priority: query.priority as string | undefined,
				p_category: query.category as string | undefined,
				p_status: query.status as string | undefined,
				p_limit: query.limit as number | undefined,
				p_offset: query.offset as number | undefined,
				p_sort_by: query.sortBy as string | undefined,
				p_sort_order: query.sortOrder as string | undefined
			})

		if (error) {
			this.logger.error(
				{
					error: {
						name: error.constructor.name,
						message: error.message,
						code: error.code
					},
					maintenance: {
						userId,
						query
					}
				},
				'Failed to get maintenance requests'
			)
			throw new BadRequestException('Failed to retrieve maintenance requests')
		}

		return data
	}

	/**
	 * Get maintenance statistics using RPC
	 */
	async getStats(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_maintenance_stats', { p_user_id: userId })
			.single()

		if (error) {
			this.logger.error('Failed to get maintenance stats', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to retrieve maintenance statistics')
		}

		return data
	}

	/**
	 * Get urgent maintenance requests using RPC
	 */
	async getUrgent(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_urgent_maintenance', { p_user_id: userId })

		if (error) {
			this.logger.error('Failed to get urgent maintenance', {
				userId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to retrieve urgent maintenance requests'
			)
		}

		return data
	}

	/**
	 * Get overdue maintenance requests using RPC
	 */
	async getOverdue(userId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_overdue_maintenance', { p_user_id: userId })

		if (error) {
			this.logger.error('Failed to get overdue maintenance', {
				userId,
				error: error.message
			})
			throw new BadRequestException(
				'Failed to retrieve overdue maintenance requests'
			)
		}

		return data
	}

	/**
	 * Get single maintenance request using RPC
	 */
	async findOne(userId: string, maintenanceId: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('get_maintenance_by_id', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId
			})
			.single()

		if (error) {
			this.logger.error('Failed to get maintenance request', {
				userId,
				maintenanceId,
				error: error.message
			})
			return null
		}

		return data
	}

	/**
	 * Create maintenance request using RPC
	 */
	async create(userId: string, createRequest: CreateMaintenanceRequest) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('create_maintenance', {
				p_user_id: userId,
				p_unit_id: createRequest.unitId,
				p_title: createRequest.title,
				p_description: createRequest.description,
				p_priority: createRequest.priority || 'MEDIUM',
				p_category: createRequest.category || 'GENERAL',
				p_scheduled_date: createRequest.scheduledDate || undefined,
				p_estimated_cost: createRequest.estimatedCost || undefined
			})
			.single()

		if (error) {
			this.logger.error('Failed to create maintenance request', {
				userId,
				error: error.message
			})
			throw new BadRequestException('Failed to create maintenance request')
		}

		return data
	}

	/**
	 * Update maintenance request using RPC
	 */
	async update(
		userId: string,
		maintenanceId: string,
		updateRequest: UpdateMaintenanceRequest
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('update_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_title: updateRequest.title,
				p_description: updateRequest.description,
				p_priority: updateRequest.priority,
				p_category: updateRequest.category,
				p_status: updateRequest.status,
				p_scheduled_date: updateRequest.scheduledDate,
				p_completed_date: updateRequest.completedDate,
				p_estimated_cost: updateRequest.estimatedCost,
				p_actual_cost: updateRequest.actualCost,
				p_notes: updateRequest.notes
			})
			.single()

		if (error) {
			this.logger.error('Failed to update maintenance request', {
				userId,
				maintenanceId,
				error: error.message
			})
			return null
		}

		// Emit event for notification service using native EventEmitter2
		if (data) {
			const maintenanceRecord = data as {
				title?: string
				status?: string
				priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
				property_name?: string
				unit_number?: string
				description?: string
			}
			this.eventEmitter.emit(
				'maintenance.updated',
				new MaintenanceUpdatedEvent(
					userId,
					maintenanceId,
					maintenanceRecord.title ||
						updateRequest.title ||
						'Maintenance Request',
					maintenanceRecord.status || updateRequest.status || 'PENDING',
					maintenanceRecord.priority ||
						(updateRequest.priority === 'URGENT'
							? 'EMERGENCY'
							: updateRequest.priority) ||
						'MEDIUM',
					maintenanceRecord.property_name || 'Property',
					maintenanceRecord.unit_number || 'Unit',
					maintenanceRecord.description ||
						updateRequest.description ||
						'Maintenance request updated'
				)
			)
		}

		return data
	}

	/**
	 * Delete maintenance request using RPC
	 */
	async remove(userId: string, maintenanceId: string) {
		const { error } = await this.supabaseService
			.getAdminClient()
			.rpc('delete_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId
			})

		if (error) {
			this.logger.error('Failed to delete maintenance request', {
				userId,
				maintenanceId,
				error: error.message
			})
			throw new BadRequestException('Failed to delete maintenance request')
		}
	}

	/**
	 * Complete maintenance request using RPC
	 */
	async complete(
		userId: string,
		maintenanceId: string,
		actualCost?: number,
		notes?: string
	) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('complete_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_actual_cost: actualCost || undefined,
				p_notes: notes || undefined
			})
			.single()

		if (error) {
			this.logger.error('Failed to complete maintenance request', {
				userId,
				maintenanceId,
				error: error.message
			})
			throw new BadRequestException('Failed to complete maintenance request')
		}

		return data
	}

	/**
	 * Cancel maintenance request using RPC
	 */
	async cancel(userId: string, maintenanceId: string, reason?: string) {
		const { data, error } = await this.supabaseService
			.getAdminClient()
			.rpc('cancel_maintenance', {
				p_user_id: userId,
				p_maintenance_id: maintenanceId,
				p_reason: reason || 'Cancelled by user'
			})
			.single()

		if (error) {
			this.logger.error('Failed to cancel maintenance request', {
				userId,
				maintenanceId,
				error: error.message
			})
			throw new BadRequestException('Failed to cancel maintenance request')
		}

		return data
	}
}
