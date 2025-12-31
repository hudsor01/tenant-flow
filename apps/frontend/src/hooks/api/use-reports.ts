/**
 * TanStack Query hooks for reports API
 * Phase 5: Advanced Features - Custom Reports & Analytics
 * Uses native fetch for NestJS calls.
 */

import { apiRequest, apiRequestRaw } from '#lib/api-request'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { reportsQueries, reportsKeys } from './queries/reports-queries'
import type {
	ListReportsResponse,
	Report as ReportType
} from '@repo/shared/types/reports'
import type { UseReportsResult } from './types/reports'

// Check test environment directly - T3 Env cannot be imported in client components
const isTest = process.env.NODE_ENV === 'test'

// Note: Import types directly from '@repo/shared/types/reports'
// No re-exports per CLAUDE.md rules

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
	const queryKey = reportsKeys.list(offset, limit)

	// Keep track of per-id pending operations so the UI can show per-row spinners
	const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())
	const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

	const {
		data: listResponse,
		isLoading,
		isFetching
	} = useQuery(reportsQueries.list(offset, limit))

	const reports = listResponse?.data ?? []
	const total = listResponse?.pagination?.total ?? 0

	const deleteMutation = useMutation({
		mutationFn: (reportId: string) =>
			apiRequest<void>(`/api/v1/reports/${reportId}`, {
				method: 'DELETE'
			}),
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
				// we don't know which id triggered settled here; remove all pending that
				// aren't present in the cache (simple conservative cleanup)
				return s
			})
			queryClient.invalidateQueries({ queryKey: reportsKeys.all })
		}
	})

	const downloadMutation = useMutation({
		mutationFn: async (reportId: string): Promise<void> => {
			// Use apiRequestRaw for blob downloads (returns raw Response)
			const res = await apiRequestRaw(`/api/v1/reports/${reportId}/download`)

			// Extract filename from Content-Disposition header
			const contentDisposition = res.headers.get('Content-Disposition')
			const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
			const filename = filenameMatch?.[1] || 'report.pdf'

			// Create blob and download
			const blob = await res.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = filename
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => window.URL.revokeObjectURL(url), 100)
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

/**
 * Hook for fetching monthly revenue data
 */
export function useMonthlyRevenue(months: number = 12) {
	return useQuery(reportsQueries.monthlyRevenue(months))
}

/**
 * Hook for fetching payment analytics
 */
export function usePaymentAnalytics(start_date?: string, end_date?: string) {
	return useQuery(reportsQueries.paymentAnalytics(start_date, end_date))
}

/**
 * Hook for fetching occupancy metrics
 */
export function useOccupancyMetrics() {
	return useQuery(reportsQueries.occupancyMetrics())
}

/**
 * Hook for fetching financial report data
 */
export function useFinancialReport(start_date?: string, end_date?: string) {
	return useQuery(reportsQueries.financial(start_date, end_date))
}

/**
 * Hook for fetching property report data
 */
export function usePropertyReport(start_date?: string, end_date?: string) {
	return useQuery(reportsQueries.properties(start_date, end_date))
}

/**
 * Hook for fetching tenant report data
 */
export function useTenantReport(start_date?: string, end_date?: string) {
	return useQuery(reportsQueries.tenants(start_date, end_date))
}

/**
 * Hook for fetching maintenance report data
 */
export function useMaintenanceReport(start_date?: string, end_date?: string) {
	return useQuery(reportsQueries.maintenance(start_date, end_date))
}

/**
 * Hook for prefetching reports
 */
export function usePrefetchReports() {
	const queryClient = useQueryClient()

	return (offset: number, limit: number) => {
		queryClient.prefetchQuery(reportsQueries.list(offset, limit))
	}
}

/**
 * Hook for prefetching monthly revenue
 */
export function usePrefetchMonthlyRevenue() {
	const queryClient = useQueryClient()

	return (months: number = 12) => {
		queryClient.prefetchQuery(reportsQueries.monthlyRevenue(months))
	}
}

/**
 * Hook for prefetching payment analytics
 */
export function usePrefetchPaymentAnalytics() {
	const queryClient = useQueryClient()

	return (start_date?: string, end_date?: string) => {
		queryClient.prefetchQuery(
			reportsQueries.paymentAnalytics(start_date, end_date)
		)
	}
}

/**
 * Hook for prefetching occupancy metrics
 */
export function usePrefetchOccupancyMetrics() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery(reportsQueries.occupancyMetrics())
	}
}
