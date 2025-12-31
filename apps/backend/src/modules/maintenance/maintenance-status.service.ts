/**
 * Maintenance Status Service
 * Handles status/priority normalization and update notifications
 */

import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type {
	MaintenanceRequest,
	MaintenanceStatus,
	MaintenancePriority
} from '@repo/shared/types/core'
import type { MaintenanceRequestUpdate } from '@repo/shared/validation/maintenance'
import type { Database } from '@repo/shared/types/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class MaintenanceStatusService {
	// Reverse map for converting database priority values to enum values for events
	private readonly reversePriorityMap: Record<
		string,
		'low' | 'medium' | 'high' | 'urgent'
	> = {
		low: 'low',
		normal: 'medium',
		high: 'high',
		urgent: 'urgent'
	}

	// Map incoming enums to database values
	private readonly priorityMap: Record<string, MaintenancePriority> = {
		LOW: 'low',
		MEDIUM: 'normal',
		HIGH: 'high',
		URGENT: 'urgent'
	}

	private readonly statusMap: Record<string, MaintenanceStatus> = {
		PENDING: 'open',
		IN_PROGRESS: 'in_progress',
		COMPLETED: 'completed',
		CANCELLED: 'cancelled'
	}

	constructor(
		private readonly eventEmitter: EventEmitter2,
		private readonly logger: AppLogger
	) {}

	applyStatusUpdates(
		updateRequest: MaintenanceRequestUpdate,
		updatedData: Database['public']['Tables']['maintenance_requests']['Update']
	) {
		if (updateRequest.priority !== undefined) {
			updatedData.priority =
				this.priorityMap[updateRequest.priority] ?? 'normal'
		}
		if (updateRequest.status !== undefined) {
			updatedData.status = this.statusMap[updateRequest.status] ?? 'open'
		}
		if (updateRequest.completed_at !== undefined) {
			updatedData.completed_at = updateRequest.completed_at
				? new Date(updateRequest.completed_at).toISOString()
				: null
		}
	}

	async emitUpdatedEvents(
		client: SupabaseClient<Database>,
		updated: MaintenanceRequest
	): Promise<void> {
		try {
			const { data: unit, error } = await client
				.from('units')
				.select('unit_number, property:property_id(name)')
				.eq('id', updated.unit_id)
				.single()

			if (error) {
				this.logger.warn('Failed to load unit for maintenance update event', {
					error: error.message,
					maintenanceId: updated.id
				})
			}

			const propertyName = unit?.property?.name || 'Unknown Property'
			const unitNumber = unit?.unit_number || 'Unknown Unit'
			const title = updated.title || updated.description || 'Maintenance Request'
			const priority =
				this.reversePriorityMap[updated.priority] || 'medium'
			const tenantUserId = updated.requested_by
			const ownerUserId = updated.owner_user_id

			// Notify tenant (requester) if different from owner.
			if (tenantUserId && tenantUserId !== ownerUserId) {
				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						tenantUserId,
						updated.id,
						title,
						updated.status,
						priority,
						propertyName,
						unitNumber,
						updated.description ?? '',
						`/tenant/maintenance/request/${updated.id}`
					)
				)
			}

			// Always notify owner.
			if (ownerUserId) {
				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						ownerUserId,
						updated.id,
						title,
						updated.status,
						priority,
						propertyName,
						unitNumber,
						updated.description ?? '',
						`/maintenance/${updated.id}`
					)
				)
			}
		} catch (error) {
			this.logger.error(
				'Failed to emit maintenance updated events',
				{
					error: error instanceof Error ? error.message : String(error),
					maintenanceId: updated.id
				}
			)
		}
	}
}
