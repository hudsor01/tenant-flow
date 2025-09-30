import type {
  ActivityInsert,
  ActivityQueryOptions,
  ActivityRepositoryContract,
  ActivityUpdate
} from '@repo/shared/types/activity-repository'
import type { Activity } from '@repo/shared/types/activity'
import type { Database } from '@repo/shared/types/supabase-generated'

export type { Activity, ActivityInsert, ActivityUpdate, ActivityQueryOptions }

export type IActivityRepository = ActivityRepositoryContract
export type ActivityEntityType = Database['public']['Enums']['ActivityEntityType']
