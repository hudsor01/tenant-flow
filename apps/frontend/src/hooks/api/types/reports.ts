/**
 * Reports hook types
 */

import type { UseMutationResult } from '@tanstack/react-query'
import type { Report } from '@repo/shared/types/reports'

export interface UseReportsResult {
	reports: Report[]
	total: number
	isLoading: boolean
	isFetching: boolean
	deleteMutation: UseMutationResult<void, unknown, string, unknown>
	downloadMutation: UseMutationResult<void, unknown, string, unknown>
	downloadingIds: Set<string>
	deletingIds: Set<string>
	downloadReport: (reportId: string) => void
	deleteReport: (reportId: string) => void
}

// Note: Import these types directly from '@repo/shared/types/reports'
// No re-exports per CLAUDE.md rules
