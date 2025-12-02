import type {
	ListReportsResponse,
	OccupancyMetrics,
	PaymentAnalytics,
	Report,
	RevenueData
} from '@repo/shared/types/reports'
import type { UseMutationResult } from '@tanstack/react-query'

export type UseReportsResult = {
	reports: Report[]
	total: number
	isLoading: boolean
	isFetching: boolean
	deleteMutation: UseMutationResult<
		void,
		unknown,
		string,
		{ previous?: ListReportsResponse }
	>
	downloadMutation: UseMutationResult<void, unknown, string, unknown>
	downloadingIds: Set<string>
	deletingIds: Set<string>
	downloadReport: (reportId: string) => void
	deleteReport: (reportId: string) => void
}

export type {
	Report,
	ListReportsResponse,
	RevenueData,
	PaymentAnalytics,
	OccupancyMetrics
}
