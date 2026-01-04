import type { SupabaseService } from '../../database/supabase.service'
import type { AppLogger } from '../../logger/app-logger.service'

export function parseDateRange(start_date?: string, end_date?: string) {
	const now = new Date()
	const end = end_date ? new Date(end_date) : now
	const start = start_date
		? new Date(start_date)
		: new Date(now.getFullYear(), now.getMonth() - 11, 1)
	return { start, end }
}

export function buildMonthBuckets(start: Date, end: Date) {
	const buckets = new Map<string, { income: number; expenses: number }>()
	const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
	const last = new Date(end.getFullYear(), end.getMonth(), 1)

	while (cursor <= last) {
		const key = cursor.toISOString().substring(0, 7)
		buckets.set(key, { income: 0, expenses: 0 })
		cursor.setMonth(cursor.getMonth() + 1)
	}

	return buckets
}

export async function loadPropertyIdsByOwner(
	supabase: SupabaseService,
	logger: AppLogger,
	user_id: string
): Promise<string[]> {
	const { data, error } = await supabase
		.getAdminClient()
		.from('properties')
		.select('id')
		.eq('owner_user_id', user_id)

	if (error) {
		logger.error('Failed to load properties', { error: error.message })
		return []
	}

	return (data ?? []).map(row => row.id)
}
