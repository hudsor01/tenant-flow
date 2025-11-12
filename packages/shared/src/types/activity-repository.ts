import type { Activity } from './activity.js'
import type { QueryParams } from './core.js'
import type {
	Database,
	TablesInsert,
	TablesUpdate
} from './supabase-generated.js'
import type { BaseRepository } from './repository-base.js'

export type ActivityInsert = TablesInsert<'activity'>
export type ActivityUpdate = TablesUpdate<'activity'>

export interface ActivityQueryOptions extends QueryParams {
	entityType?: Database['public']['Enums']['ActivityEntityType']
	entityId?: string
	action?: string
	dateFrom?: Date
	dateTo?: Date
}

export interface ActivityRepositoryContract
	extends BaseRepository<
		Activity,
		ActivityInsert,
		ActivityUpdate,
		ActivityQueryOptions
	> {
	findByUserIdWithSearch(
		userId: string,
		options: ActivityQueryOptions
	): Promise<Activity[]>
	findByEntity(
		entityType: Database['public']['Enums']['ActivityEntityType'],
		entityId: string
	): Promise<Activity[]>
}
