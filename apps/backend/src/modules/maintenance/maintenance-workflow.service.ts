/**
 * Maintenance Workflow Service
 * Handles status updates, completion, and cancellation workflows
 * Extracted from MaintenanceService for SRP compliance
 */

import { Injectable } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { MaintenanceUpdatedEvent } from '../notifications/events/notification.events'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class MaintenanceWorkflowService {

	// Reverse map for converting database priority values to enum values for events
	private readonly reversePriorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
		low: 'LOW',
		normal: 'MEDIUM',
		high: 'HIGH',
		urgent: 'URGENT'
	}

	constructor(private readonly supabase: SupabaseService,
		private readonly eventEmitter: EventEmitter2, private readonly logger: AppLogger) {}

	/**
	 * Update status - consolidated method (replaces complete and cancel)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async updateStatus(
		token: string,
		maintenanceId: string,
		status: string,
		notes?: string
	): Promise<MaintenanceRequest | null> {
		try {
			if (!token || !maintenanceId || !status) {
				this.logger.warn(
					'Update maintenance status called with missing parameters',
					{ maintenanceId, status }
				)
				return null
			}

			this.logger.log('Updating maintenance status via RLS-protected query', {
				maintenanceId,
				status,
				notes
			})

			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] = {
				status: status,
				updated_at: new Date().toISOString()
			}

			if (status === 'completed') {
				updated_data.completed_at = new Date().toISOString()
			}

			const { data, error } = await client
				.from('maintenance_requests')
				.update(updated_data)
				.eq('id', maintenanceId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to update maintenance status in Supabase', {
					error: error.message,
					maintenanceId,
					status
				})
				return null
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Maintenance workflow service failed to update status', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId,
				status,
				notes
			})
			return null
		}
	}

	/**
	 * Complete maintenance request - convenience method for marking as completed
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically verifies ownership
	 */
	async complete(
		token: string,
		maintenanceId: string,
		actualCost?: number,
		notes?: string
	): Promise<MaintenanceRequest | null> {
		try {
			this.logger.log('Completing maintenance request', {
				maintenanceId,
				actualCost,
				notes
			})

			const client = this.supabase.getUserClient(token)

			const updated_data: Database['public']['Tables']['maintenance_requests']['Update'] = {
				status: 'completed',
				completed_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}

			if (actualCost !== undefined) {
				updated_data.actual_cost = actualCost
			}

			const { data, error } = await client
				.from('maintenance_requests')
				.update(updated_data)
				.eq('id', maintenanceId)
				.select()
				.single()

			if (error) {
				this.logger.error('Failed to complete maintenance request', {
					error: error.message,
					maintenanceId
				})
				return null
			}

			// Emit event for notifications
			if (data) {
				const updated = data as MaintenanceRequest
				const propertyLabel = updated.unit_id
					? `Unit ${updated.unit_id}`
					: 'Unknown Property'
				const unit_numberLabel = updated.unit_id ?? 'N/A'

				this.eventEmitter.emit(
					'maintenance.updated',
					new MaintenanceUpdatedEvent(
						updated.requested_by ?? '',
						updated.id,
						updated.description ?? '',
						updated.status ?? 'completed',
						this.reversePriorityMap[updated.priority || 'normal'] || 'MEDIUM',
						propertyLabel,
						unit_numberLabel,
						updated.description ?? ''
					)
				)
			}

			return data as MaintenanceRequest
		} catch (error) {
			this.logger.error('Failed to complete maintenance request', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return null
		}
	}

	/**
	 * Cancel maintenance request - convenience method for marking as canceled
	 * RLS COMPLIANT: Delegates to updateStatus() which uses getUserClient(token)
	 */
	async cancel(
		token: string,
		maintenanceId: string,
		reason?: string
	): Promise<MaintenanceRequest | null> {
		try {
			this.logger.log('Canceling maintenance request', {
				maintenanceId,
				reason
			})

			return this.updateStatus(token, maintenanceId, 'cancelled', reason)
		} catch (error) {
			this.logger.error('Failed to cancel maintenance request', {
				error: error instanceof Error ? error.message : String(error),
				maintenanceId
			})
			return null
		}
	}
}