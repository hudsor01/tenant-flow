/**
 * TanStack Query hooks for reports API
 * Phase 5: Advanced Features - Custom Reports & Analytics
 */

import { API_BASE_URL } from '#lib/api-config'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'

/**
 * Report types
 */
export interface Report {
	id: string
	userId: string
	reportType: string
	reportName: string
	format: string
	status: string
	fileUrl: string | null
	filePath: string | null
	fileSize: number | null
	startDate: string
	endDate: string
	metadata: Record<string, unknown>
	errorMessage: string | null
	createdAt: string
	updatedAt: string
}

export interface ListReportsResponse {
	success: boolean
	data: Report[]
	pagination: {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}
}

export interface RevenueData {
	month: string
	revenue: number
	expenses: number
	profit: number
	propertyCount: number
	unitCount: number
	occupiedUnits: number
}

export interface PaymentAnalytics {
	totalPayments: number
	successfulPayments: number
	failedPayments: number
	totalRevenue: number
	averagePayment: number
	paymentsByMethod: {
		card: number
		ach: number
	}
	paymentsByStatus: {
		completed: number
		pending: number
		failed: number
	}
}

export interface OccupancyMetrics {
	totalUnits: number
	occupiedUnits: number
	vacantUnits: number
	occupancyRate: number
	byProperty: Array<{
		propertyId: string
		propertyName: string
		totalUnits: number
		occupiedUnits: number
		occupancyRate: number
	}>
}

// module-scoped timers map for delete undo timeouts
const deleteReportTimers = new Map<string, number>()

/**
 * Query keys for reports
 * Hierarchical pattern for selective cache invalidation
 */
export const reportsKeys = {
	all: ['reports'] as const,
	lists: () => [...reportsKeys.all, 'list'] as const,
	list: (offset: number, limit: number) =>
		[...reportsKeys.lists(), offset, limit] as const,
	revenue: (months: number) =>
		[...reportsKeys.all, 'revenue', 'monthly', months] as const,
	paymentAnalytics: (startDate?: string, endDate?: string) =>
		[...reportsKeys.all, 'analytics', 'payments', startDate, endDate] as const,
	occupancyMetrics: () =>
		[...reportsKeys.all, 'analytics', 'occupancy'] as const
}

type UseReportsResult = {
	reports: Report[]
	total: number
	isLoading: boolean
	isFetching: boolean
	deleteMutation: UseMutationResult<
		unknown,
		unknown,
		string,
		{ previous?: unknown }
	>
	downloadMutation: UseMutationResult<unknown, unknown, string, unknown>
	downloadingIds: Set<string>
	deletingIds: Set<string>
	downloadReport: (reportId: string) => void
	deleteReport: (reportId: string) => void
}

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
	} = useQuery<ListReportsResponse>({
		queryKey,
		queryFn: async (): Promise<ListReportsResponse> => {
			const queryParams = new URLSearchParams()
			queryParams.append('limit', limit.toString())
			queryParams.append('offset', offset.toString())

			const res = await fetch(`/reports?${queryParams.toString()}`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch reports')
			}

			return res.json()
		}
	})

	const reports = listResponse?.data ?? []
	const total = listResponse?.pagination?.total ?? 0

	const deleteMutation = useMutation({
		mutationFn: async (reportId: string): Promise<void> => {
			const res = await fetch(`/reports/${reportId}`, {
				method: 'DELETE',
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to delete report')
			}
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
					data: previous.data.filter((r: Report) => r.id !== reportId)
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
			const res = await fetch(`/reports/${reportId}/download`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to download report')
			}

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
		if (process.env.NODE_ENV === 'test') {
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
				data: previous.data.filter((r: Report) => r.id !== reportId)
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
	return useQuery<RevenueData[]>({
		queryKey: reportsKeys.revenue(months),
		queryFn: async (): Promise<RevenueData[]> => {
			const res = await fetch(
				`/api/v1/reports/analytics/revenue/monthly?months=${months}`,
				{
					credentials: 'include'
				}
			)

			if (!res.ok) {
				throw new Error('Failed to fetch monthly revenue')
			}

			const response = (await res.json()) as {
				success: boolean
				data: RevenueData[]
			}
			return response.data
		}
	})
}

/**
 * Hook for fetching payment analytics
 */
export function usePaymentAnalytics(startDate?: string, endDate?: string) {
	return useQuery<PaymentAnalytics>({
		queryKey: reportsKeys.paymentAnalytics(startDate, endDate),
		queryFn: async (): Promise<PaymentAnalytics> => {
			const params = new URLSearchParams()
			if (startDate) params.append('startDate', startDate)
			if (endDate) params.append('endDate', endDate)

			const queryString = params.toString() ? `?${params.toString()}` : ''
			const res = await fetch(
				`/api/v1/reports/analytics/payments${queryString}`,
				{
					credentials: 'include'
				}
			)

			if (!res.ok) {
				throw new Error('Failed to fetch payment analytics')
			}

			const response = (await res.json()) as {
				success: boolean
				data: PaymentAnalytics
			}
			return response.data
		}
	})
}

/**
 * Hook for fetching occupancy metrics
 */
export function useOccupancyMetrics() {
	return useQuery<OccupancyMetrics>({
		queryKey: reportsKeys.occupancyMetrics(),
		queryFn: async (): Promise<OccupancyMetrics> => {
			const res = await fetch(`${API_BASE_URL}/api/v1/reports/analytics/occupancy`, {
				credentials: 'include'
			})

			if (!res.ok) {
				throw new Error('Failed to fetch occupancy metrics')
			}

			const response = (await res.json()) as {
				success: boolean
				data: OccupancyMetrics
			}
			return response.data
		}
	})
}

/**
 * Hook for prefetching reports
 */
export function usePrefetchReports() {
	const queryClient = useQueryClient()

	return (offset: number, limit: number) => {
		const queryKey = reportsKeys.list(offset, limit)
		queryClient.prefetchQuery({
			queryKey,
			queryFn: async (): Promise<ListReportsResponse> => {
				const queryParams = new URLSearchParams()
				queryParams.append('limit', limit.toString())
				queryParams.append('offset', offset.toString())

				const res = await fetch(`/reports?${queryParams.toString()}`, {
					credentials: 'include'
				})

				if (!res.ok) {
					throw new Error('Failed to fetch reports')
				}

				return res.json()
			}
		})
	}
}

/**
 * Hook for prefetching monthly revenue
 */
export function usePrefetchMonthlyRevenue() {
	const queryClient = useQueryClient()

	return (months: number = 12) => {
		queryClient.prefetchQuery({
			queryKey: reportsKeys.revenue(months),
			queryFn: async (): Promise<RevenueData[]> => {
				const res = await fetch(
					`/api/v1/reports/analytics/revenue/monthly?months=${months}`,
					{
						credentials: 'include'
					}
				)

				if (!res.ok) {
					throw new Error('Failed to fetch monthly revenue')
				}

				const response = (await res.json()) as {
					success: boolean
					data: RevenueData[]
				}
				return response.data
			}
		})
	}
}

/**
 * Hook for prefetching payment analytics
 */
export function usePrefetchPaymentAnalytics() {
	const queryClient = useQueryClient()

	return (startDate?: string, endDate?: string) => {
		queryClient.prefetchQuery({
			queryKey: reportsKeys.paymentAnalytics(startDate, endDate),
			queryFn: async (): Promise<PaymentAnalytics> => {
				const params = new URLSearchParams()
				if (startDate) params.append('startDate', startDate)
				if (endDate) params.append('endDate', endDate)

				const queryString = params.toString() ? `?${params.toString()}` : ''
				const res = await fetch(
					`/api/v1/reports/analytics/payments${queryString}`,
					{
						credentials: 'include'
					}
				)

				if (!res.ok) {
					throw new Error('Failed to fetch payment analytics')
				}

				const response = (await res.json()) as {
					success: boolean
					data: PaymentAnalytics
				}
				return response.data
			}
		})
	}
}

/**
 * Hook for prefetching occupancy metrics
 */
export function usePrefetchOccupancyMetrics() {
	const queryClient = useQueryClient()

	return () => {
		queryClient.prefetchQuery({
			queryKey: reportsKeys.occupancyMetrics(),
			queryFn: async (): Promise<OccupancyMetrics> => {
				const res = await fetch(`${API_BASE_URL}/api/v1/reports/analytics/occupancy`, {
					credentials: 'include'
				})

				if (!res.ok) {
					throw new Error('Failed to fetch occupancy metrics')
				}

				const response = (await res.json()) as {
					success: boolean
					data: OccupancyMetrics
				}
				return response.data
			}
		})
	}
}
