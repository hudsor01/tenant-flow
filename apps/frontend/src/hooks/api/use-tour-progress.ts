import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'

const logger = createLogger({ component: 'TourProgress' })

export type TourKey = 'owner-onboarding' | 'tenant-onboarding'
export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped'

export interface TourProgress {
	tour_key: TourKey
	status: TourStatus
	current_step: number
	completed_at: string | null
	skipped_at: string | null
	last_seen_at: string | null
}

export interface TourProgressUpdate {
	status?: TourStatus
	current_step?: number
}

export async function getTourProgress(tourKey: TourKey): Promise<TourProgress> {
	try {
		return await apiRequest<TourProgress>(`/api/v1/users/tours/${tourKey}`)
	} catch (error) {
		logger.error('Failed to fetch tour progress', { tourKey, error })
		throw error
	}
}

export async function updateTourProgress(
	tourKey: TourKey,
	update: TourProgressUpdate
): Promise<TourProgress> {
	try {
		return await apiRequest<TourProgress>(`/api/v1/users/tours/${tourKey}`, {
			method: 'PATCH',
			body: JSON.stringify(update)
		})
	} catch (error) {
		logger.error('Failed to update tour progress', { tourKey, error })
		throw error
	}
}

export async function resetTourProgress(tourKey: TourKey): Promise<TourProgress> {
	try {
		return await apiRequest<TourProgress>(
			`/api/v1/users/tours/${tourKey}/reset`,
			{
				method: 'POST'
			}
		)
	} catch (error) {
		logger.error('Failed to reset tour progress', { tourKey, error })
		throw error
	}
}
