import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createClient } from '#lib/supabase/client'

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
		const supabase = createClient()
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Not authenticated')

		const { data, error } = await supabase
			.from('user_tour_progress')
			.select(
				'tour_key, status, current_step, completed_at, skipped_at, last_seen_at'
			)
			.eq('user_id', user.id)
			.eq('tour_key', tourKey)
			.maybeSingle()

		if (error) throw error

		if (!data) {
			// No record yet — return default not_started
			return {
				tour_key: tourKey,
				status: 'not_started',
				current_step: 0,
				completed_at: null,
				skipped_at: null,
				last_seen_at: null
			}
		}

		const progress: TourProgress = {
			tour_key: data.tour_key as TourKey,
			status: data.status as TourStatus,
			current_step: data.current_step ?? 0,
			completed_at: data.completed_at,
			skipped_at: data.skipped_at,
			last_seen_at: data.last_seen_at
		}

		if (progress.status === 'completed' || progress.status === 'skipped') {
			setLocalTourStatus(tourKey, progress.status)
		}

		return progress
	} catch (error) {
		logger.error('Failed to fetch tour progress', {
			tourKey,
			error
		})
		// Fall through to localStorage fallback
		const localStatusFallback = getLocalTourStatus(tourKey)
		if (localStatusFallback) {
			return {
				tour_key: tourKey,
				status: localStatusFallback,
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
		const supabase = createClient()
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Not authenticated')

		const now = new Date().toISOString()
		const { data, error } = await supabase
			.from('user_tour_progress')
			.upsert(
				{
					user_id: user.id,
					tour_key: tourKey,
					status: update.status ?? 'in_progress',
					current_step: update.current_step ?? 0,
					...(update.status === 'completed' ? { completed_at: now } : {}),
					...(update.status === 'skipped' ? { skipped_at: now } : {}),
					last_seen_at: now,
					updated_at: now
				},
				{ onConflict: 'user_id,tour_key' }
			)
			.select(
				'tour_key, status, current_step, completed_at, skipped_at, last_seen_at'
			)
			.single()

		if (error) throw error

		return {
			tour_key: data.tour_key as TourKey,
			status: data.status as TourStatus,
			current_step: data.current_step ?? 0,
			completed_at: data.completed_at,
			skipped_at: data.skipped_at,
			last_seen_at: data.last_seen_at
		}
	} catch (error) {
		logger.error('Failed to update tour progress', {
			tourKey,
			error
		})
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
		const supabase = createClient()
		const {
			data: { user }
		} = await supabase.auth.getUser()
		if (!user) throw new Error('Not authenticated')

		const now = new Date().toISOString()
		const { data, error } = await supabase
			.from('user_tour_progress')
			.upsert(
				{
					user_id: user.id,
					tour_key: tourKey,
					status: 'not_started',
					current_step: 0,
					completed_at: null,
					skipped_at: null,
					last_seen_at: now,
					updated_at: now
				},
				{ onConflict: 'user_id,tour_key' }
			)
			.select(
				'tour_key, status, current_step, completed_at, skipped_at, last_seen_at'
			)
			.single()

		if (error) throw error

		return {
			tour_key: data.tour_key as TourKey,
			status: data.status as TourStatus,
			current_step: data.current_step ?? 0,
			completed_at: data.completed_at,
			skipped_at: data.skipped_at,
			last_seen_at: data.last_seen_at
		}
	} catch (error) {
		logger.error('Failed to reset tour progress', {
			tourKey,
			error
		})
		// Return reset status if API fails
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
