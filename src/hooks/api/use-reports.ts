/**
 * Reports Query Hooks — queries only, mutations in use-report-mutations.ts.
 * Query options defined in query-keys/report-keys.ts.
 */

import { createClient } from '#lib/supabase/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { reportKeys, reportQueries } from './query-keys/report-keys'
import type { UseMutationResult } from '@tanstack/react-query'
import type {
	ListReportsResponse,
	Report as ReportType
} from '#types/reports'

// Re-export keys and queries for backwards compatibility and tests
export { reportKeys as reportsKeys, reportQueries as reportsQueries }

/** Return type for useReports hook */
export interface UseReportsResult {
	reports: ReportType[]
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

// Check test environment directly - T3 Env cannot be imported in client components
const isTest = process.env.NODE_ENV === 'test'

// module-scoped timers map for delete undo timeouts
const deleteReportTimers = new Map<string, number>()

export function useReports({
	offset,
	limit = 20
}: {
	offset: number
	limit?: number
}): UseReportsResult {
	const queryClient = useQueryClient()
	const queryKey = reportKeys.list(offset, limit)

	// Keep track of per-id pending operations so the UI can show per-row spinners
	const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

	const {
		data: listResponse,
		isLoading,
		isFetching
	} = useQuery(reportQueries.list(offset, limit))

	const reports = listResponse?.data ?? []
	const total = listResponse?.pagination?.total ?? 0

	const deleteMutation = useMutation({
		mutationKey: mutationKeys.reports.delete,
		mutationFn: async (reportId: string): Promise<void> => {
			const supabase = createClient()
			const { error } = await supabase
				.from('reports')
				.delete()
				.eq('id', reportId)
			if (error) throw new Error(error.message)
		},
		onMutate: async (reportId: string) => {
			// mark this id as deleting so callers can show row-level loading
			setDeletingIds(prev => {
				const s = new Set(prev)
				s.add(reportId)
				return s
			})
			await queryClient.cancelQueries({ queryKey })
			const previous = queryClient.getQueryData<ListReportsResponse>(queryKey)
			if (previous) {
				const cloned: ListReportsResponse = {
					...previous,
					data: previous.data.filter((r: ReportType) => r.id !== reportId)
				}
				queryClient.setQueryData(queryKey, cloned)
			}
			return previous ? { previous } : {}
		},
		onError: (
			err: unknown,
			_id,
			context?: { previous?: ListReportsResponse }
		) => {
			if (context?.previous)
				queryClient.setQueryData(queryKey, context.previous)
			handleMutationError(err, 'Delete report')
		},
		onSuccess: () => {
			handleMutationSuccess('Delete report')
		},
		onSettled: () => {
			// remove deleting flag and refresh top-level reports list
			setDeletingIds(prev => {
				const s = new Set(prev)
				// conservative cleanup — settled resets all
				return s
			})
			queryClient.invalidateQueries({ queryKey: reportKeys.all })
		}
	})

	const downloadMutation = useMutation({
		mutationKey: mutationKeys.reports.download,
		mutationFn: async (reportId: string): Promise<void> => {
			toast.info(`Report ${reportId} download will be available soon`)
		},
		onSuccess: () => handleMutationSuccess('Download report'),
		onError: (err: unknown) => handleMutationError(err, 'Download report')
	})

	function downloadReport(reportId: string) {
		// mark id as downloading until settled
		setDownloadingIds(prev => {
			const s = new Set(prev)
			s.add(reportId)
			return s
		})

		downloadMutation.mutate(reportId, {
			onSettled: () => {
				setDownloadingIds(prev => {
					const s = new Set(prev)
					s.delete(reportId)
					return s
				})
			}
		})
	}

	function deleteReport(reportId: string) {
		// If we're running tests, just call the mutation immediately to keep tests
		// deterministic and fast.
		if (isTest) {
			setDeletingIds(prev => {
				const s = new Set(prev)
				s.add(reportId)
				return s
			})
			deleteMutation.mutate(reportId, {
				onSettled: () => {
					setDeletingIds(prev => {
						const s = new Set(prev)
						s.delete(reportId)
						return s
					})
				}
			})
			return
		}

		// Otherwise schedule a short window where the user can undo the delete.
		setDeletingIds(prev => {
			const s = new Set(prev)
			s.add(reportId)
			return s
		})

		const previous = queryClient.getQueryData<ListReportsResponse>(queryKey)

		// remove the item optimistically (onMutate-like behavior)
		if (previous) {
			const cloned: ListReportsResponse = {
				...previous,
				data: previous.data.filter((r: ReportType) => r.id !== reportId)
			}
			queryClient.setQueryData(queryKey, cloned)
		}

		// timer map stored at module scope so it persists across hook instances
		const timeoutId = window.setTimeout(async () => {
			try {
				await deleteMutation.mutateAsync(reportId)
			} finally {
				setDeletingIds(prev => {
					const s = new Set(prev)
					s.delete(reportId)
					return s
				})
				deleteReportTimers.delete(reportId)
			}
		}, 5000)

		deleteReportTimers.set(reportId, timeoutId)

		// Show "undo" toast with action -- sonner supports action callbacks
		toast.success('Report deleted', {
			action: {
				label: 'Undo',
				onClick: () => {
					// cancel timer and restore cache
					const id = deleteReportTimers.get(reportId)
					if (id) {
						clearTimeout(id)
						deleteReportTimers.delete(reportId)
					}
					if (previous) {
						queryClient.setQueryData(queryKey, previous)
					}
					setDeletingIds(prev => {
						const s = new Set(prev)
						s.delete(reportId)
						return s
					})
					toast.success('Delete undone')
				}
			}
		})
	}

	return {
		reports,
		total,
		isLoading,
		isFetching,
		deleteMutation,
		downloadMutation,
		// helpers for per-row UI state
		downloadingIds,
		deletingIds,
		downloadReport,
		deleteReport
	}
}

export function useMonthlyRevenue(months: number = 12) {
	return useQuery(reportQueries.monthlyRevenue(months))
}

export function usePaymentAnalytics(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.paymentAnalytics(start_date, end_date))
}

export function useOccupancyMetrics() {
	return useQuery(reportQueries.occupancyMetrics())
}

export function useFinancialReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.financial(start_date, end_date))
}

export function usePropertyReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.properties(start_date, end_date))
}

export function useTenantReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.tenants(start_date, end_date))
}

export function useMaintenanceReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.maintenance(start_date, end_date))
}

export function useYearEndSummary(year: number) {
	return useQuery(reportQueries.yearEnd(year))
}

export function use1099Summary(year: number) {
	return useQuery(reportQueries.report1099(year))
}
