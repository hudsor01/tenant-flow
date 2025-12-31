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

// LocalStorage key for tour completion fallback
const TOUR_STORAGE_KEY = 'tenantflow:tour-progress'

/**
 * Get tour completion status from localStorage (fallback for API failures)
 */
function getLocalTourStatus(tourKey: TourKey): TourStatus | null {
	if (typeof window === 'undefined') return null
	try {
		const stored = localStorage.getItem(TOUR_STORAGE_KEY)
		if (!stored) return null
		const data = JSON.parse(stored) as Record<string, TourStatus>
		return data[tourKey] ?? null
	} catch {
		return null
	}
}

/**
 * Save tour completion status to localStorage (fallback for API failures)
 */
function setLocalTourStatus(tourKey: TourKey, status: TourStatus): void {
	if (typeof window === 'undefined') return
	try {
		const stored = localStorage.getItem(TOUR_STORAGE_KEY)
		const data = stored
			? (JSON.parse(stored) as Record<string, TourStatus>)
			: {}
		data[tourKey] = status
		localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(data))
	} catch {
		// Ignore localStorage errors
	}
}

export async function getTourProgress(tourKey: TourKey): Promise<TourProgress> {
	// Check localStorage first for completed/skipped status
	const localStatus = getLocalTourStatus(tourKey)
	if (localStatus === 'completed' || localStatus === 'skipped') {
		return {
			tour_key: tourKey,
			status: localStatus,
			current_step: 0,
			completed_at: localStatus === 'completed' ? new Date().toISOString() : null,
			skipped_at: localStatus === 'skipped' ? new Date().toISOString() : null,
			last_seen_at: new Date().toISOString()
		}
	}

	try {
		const progress = await apiRequest<TourProgress>(
			`/api/v1/users/tours/${tourKey}`
		)
		// Sync completion status to localStorage
		if (progress.status === 'completed' || progress.status === 'skipped') {
			setLocalTourStatus(tourKey, progress.status)
		}
		return progress
	} catch (error) {
		logger.error('Failed to fetch tour progress', { tourKey, error })
		// Return localStorage status as fallback, or default to completed
		// to prevent broken tour from blocking UI
		if (localStatus) {
			return {
				tour_key: tourKey,
				status: localStatus,
				current_step: 0,
				completed_at: null,
				skipped_at: null,
				last_seen_at: null
			}
		}
		throw error
	}
}

export async function updateTourProgress(
	tourKey: TourKey,
	update: TourProgressUpdate
): Promise<TourProgress> {
	// Always save completion status to localStorage immediately
	if (update.status === 'completed' || update.status === 'skipped') {
		setLocalTourStatus(tourKey, update.status)
	}

	try {
		return await apiRequest<TourProgress>(`/api/v1/users/tours/${tourKey}`, {
			method: 'PATCH',
			body: JSON.stringify(update)
		})
	} catch (error) {
		logger.error('Failed to update tour progress', { tourKey, error })
		// Return success from localStorage even if API fails
		if (update.status === 'completed' || update.status === 'skipped') {
			return {
				tour_key: tourKey,
				status: update.status,
				current_step: update.current_step ?? 0,
				completed_at:
					update.status === 'completed' ? new Date().toISOString() : null,
				skipped_at:
					update.status === 'skipped' ? new Date().toISOString() : null,
				last_seen_at: new Date().toISOString()
			}
		}
		throw error
	}
}

export async function resetTourProgress(
	tourKey: TourKey
): Promise<TourProgress> {
	// Clear localStorage when resetting
	setLocalTourStatus(tourKey, 'not_started')

	try {
		return await apiRequest<TourProgress>(
			`/api/v1/users/tours/${tourKey}/reset`,
			{
				method: 'POST'
			}
		)
	} catch (error) {
		logger.error('Failed to reset tour progress', { tourKey, error })
		// Return reset status from localStorage if API fails
		return {
			tour_key: tourKey,
			status: 'not_started',
			current_step: 0,
			completed_at: null,
			skipped_at: null,
			last_seen_at: new Date().toISOString()
		}
	}
}
