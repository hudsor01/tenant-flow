import {
	BadRequestException,
	Injectable,
	InternalServerErrorException
} from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

const TOUR_KEYS = ['owner-onboarding', 'tenant-onboarding'] as const
const TOUR_STATUSES = [
	'not_started',
	'in_progress',
	'completed',
	'skipped'
] as const

export type TourKey = (typeof TOUR_KEYS)[number]
export type TourStatus = (typeof TOUR_STATUSES)[number]

type TourRow = Database['public']['Tables']['user_tour_progress']['Row']
type TourInsert = Database['public']['Tables']['user_tour_progress']['Insert']

export interface TourProgressResponse {
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

@Injectable()
export class UserToursService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	private assertTourKey(tourKey: string): TourKey {
		if (!TOUR_KEYS.includes(tourKey as TourKey)) {
			throw new BadRequestException('Invalid tour key')
		}
		return tourKey as TourKey
	}

	private assertStatus(status?: string): TourStatus | undefined {
		if (!status) return undefined
		if (!TOUR_STATUSES.includes(status as TourStatus)) {
			throw new BadRequestException('Invalid tour status')
		}
		return status as TourStatus
	}

	private assertCurrentStep(step?: number): number | undefined {
		if (step === undefined) return undefined
		if (!Number.isInteger(step) || step < 0) {
			throw new BadRequestException(
				'current_step must be a non-negative integer'
			)
		}
		return step
	}

	private toResponse(
		tourKey: TourKey,
		row?: TourRow | null
	): TourProgressResponse {
		if (!row) {
			return {
				tour_key: tourKey,
				status: 'not_started',
				current_step: 0,
				completed_at: null,
				skipped_at: null,
				last_seen_at: null
			}
		}

		return {
			tour_key: tourKey,
			status: row.status as TourStatus,
			current_step: row.current_step ?? 0,
			completed_at: row.completed_at ?? null,
			skipped_at: row.skipped_at ?? null,
			last_seen_at: row.last_seen_at ?? null
		}
	}

	private async fetchRow(token: string, user_id: string, tourKey: TourKey) {
		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('user_tour_progress')
			.select('*')
			.eq('user_id', user_id)
			.eq('tour_key', tourKey)
			.maybeSingle()

		if (error) {
			this.logger.error('Failed to fetch tour progress', {
				user_id,
				tour_key: tourKey,
				error: error.message || error
			})
			throw new InternalServerErrorException('Failed to fetch tour progress')
		}

		return data
	}

	async getTourProgress(
		token: string,
		user_id: string,
		tourKeyRaw: string
	): Promise<TourProgressResponse> {
		const tourKey = this.assertTourKey(tourKeyRaw)
		const data = await this.fetchRow(token, user_id, tourKey)
		return this.toResponse(tourKey, data)
	}

	async updateTourProgress(
		token: string,
		user_id: string,
		tourKeyRaw: string,
		update: TourProgressUpdate
	): Promise<TourProgressResponse> {
		const tourKey = this.assertTourKey(tourKeyRaw)
		const status = this.assertStatus(update.status)
		const current_step = this.assertCurrentStep(update.current_step)

		const existing = await this.fetchRow(token, user_id, tourKey)
		const now = new Date().toISOString()

		const nextStatus =
			status ?? (existing?.status as TourStatus | undefined) ?? 'not_started'
		const nextStep = current_step ?? existing?.current_step ?? 0

		let completed_at = existing?.completed_at ?? null
		let skipped_at = existing?.skipped_at ?? null

		if (status === 'completed') {
			completed_at = now
			skipped_at = null
		} else if (status === 'skipped') {
			skipped_at = now
		} else if (status === 'not_started') {
			completed_at = null
			skipped_at = null
		}

		const payload: TourInsert = {
			user_id,
			tour_key: tourKey,
			status: nextStatus,
			current_step: nextStep,
			completed_at,
			skipped_at,
			last_seen_at: now,
			updated_at: now
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('user_tour_progress')
			.upsert(payload, { onConflict: 'user_id,tour_key' })
			.select('*')
			.single()

		if (error || !data) {
			this.logger.error('Failed to update tour progress', {
				user_id,
				tour_key: tourKey,
				error: error?.message || error
			})
			throw new InternalServerErrorException('Failed to update tour progress')
		}

		return this.toResponse(tourKey, data)
	}

	async resetTourProgress(
		token: string,
		user_id: string,
		tourKeyRaw: string
	): Promise<TourProgressResponse> {
		const tourKey = this.assertTourKey(tourKeyRaw)
		const now = new Date().toISOString()

		const payload: TourInsert = {
			user_id,
			tour_key: tourKey,
			status: 'not_started',
			current_step: 0,
			completed_at: null,
			skipped_at: null,
			last_seen_at: now,
			updated_at: now
		}

		const client = this.supabase.getUserClient(token)
		const { data, error } = await client
			.from('user_tour_progress')
			.upsert(payload, { onConflict: 'user_id,tour_key' })
			.select('*')
			.single()

		if (error || !data) {
			this.logger.error('Failed to reset tour progress', {
				user_id,
				tour_key: tourKey,
				error: error?.message || error
			})
			throw new InternalServerErrorException('Failed to reset tour progress')
		}

		return this.toResponse(tourKey, data)
	}
}
