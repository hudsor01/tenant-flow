/**
 * Maintenance Assignment Service
 * Handles assignment-related updates
 */

import { Injectable } from '@nestjs/common'
import type { MaintenanceRequestUpdate } from '@repo/shared/validation/maintenance'
import type { Database } from '@repo/shared/types/supabase'

@Injectable()
export class MaintenanceAssignmentService {
	applyAssignmentUpdates(
		updateRequest: MaintenanceRequestUpdate,
		updatedData: Database['public']['Tables']['maintenance_requests']['Update']
	) {
		if (updateRequest.assigned_to !== undefined) {
			updatedData.assigned_to = updateRequest.assigned_to
		}
		if (updateRequest.scheduled_date !== undefined) {
			updatedData.scheduled_date = updateRequest.scheduled_date
				? new Date(updateRequest.scheduled_date).toISOString()
				: null
		}
	}
}
