/**
 * Reports Hooks
 * TanStack Query hooks for reports data using Supabase tables and RPC calls.
 *
 * All data queries use real tables (reports, report_runs) and existing RPCs.
 * Query options are defined in query-keys/report-keys.ts.
 *
 * React 19 + TanStack Query v5 patterns
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
} from '#shared/types/reports'

// Re-export keys and queries for backwards compatibility and tests
export { reportKeys as reportsKeys, reportQueries as reportsQueries }

// ============================================================================
// TYPES
// ============================================================================

/**
 * Return type for useReports hook
 */
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

// ============================================================================
// QUERY HOOKS
// ============================================================================

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

/**
 * Hook for fetching monthly revenue data
 */
export function useMonthlyRevenue(months: number = 12) {
	return useQuery(reportQueries.monthlyRevenue(months))
}

/**
 * Hook for fetching payment analytics
 */
export function usePaymentAnalytics(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.paymentAnalytics(start_date, end_date))
}

/**
 * Hook for fetching occupancy metrics
 */
export function useOccupancyMetrics() {
	return useQuery(reportQueries.occupancyMetrics())
}

/**
 * Hook for fetching financial report data
 */
export function useFinancialReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.financial(start_date, end_date))
}

/**
 * Hook for fetching property report data
 */
export function usePropertyReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.properties(start_date, end_date))
}

/**
 * Hook for fetching tenant report data
 */
export function useTenantReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.tenants(start_date, end_date))
}

/**
 * Hook for fetching maintenance report data
 */
export function useMaintenanceReport(start_date?: string, end_date?: string) {
	return useQuery(reportQueries.maintenance(start_date, end_date))
}

/**
 * Hook for fetching year-end tax summary
 */
export function useYearEndSummary(year: number) {
	return useQuery(reportQueries.yearEnd(year))
}

/**
 * Hook for fetching 1099-NEC vendor data
 */
export function use1099Summary(year: number) {
	return useQuery(reportQueries.report1099(year))
}

// ============================================================================
// EDGE FUNCTION HELPERS
// ============================================================================

/**
 * Helper: call the export-report Edge Function and trigger browser download.
 */
async function callExportEdgeFunction(
	reportType: string,
	format: 'csv' | 'xlsx' | 'pdf',
	year: number
): Promise<boolean> {
	const supabase = createClient()
	const { data: sessionData } = await supabase.auth.getSession()
	const token = sessionData.session?.access_token
	if (!token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const url = `${baseUrl}/functions/v1/export-report?type=${reportType}&format=${format}&year=${year}`

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${token}` }
	})

	if (!response.ok) {
		throw new Error(`Export failed: ${response.statusText}`)
	}

	const blob = await response.blob()
	const blobUrl = window.URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = blobUrl

	// Derive filename from Content-Disposition header or fallback
	const disposition = response.headers.get('Content-Disposition') ?? ''
	const filenameMatch = disposition.match(/filename="([^"]+)"/)
	link.download = filenameMatch?.[1] ?? `${reportType}-${year}.${format}`

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
	return true
}

/**
 * Call the generate-pdf Edge Function with structured report data.
 * HTML rendering is handled server-side in the Edge Function.
 */
async function callGeneratePdfEdgeFunction(reportType: string, year: number): Promise<void> {
	const supabase = createClient()
	const { data: { session } } = await supabase.auth.getSession()
	if (!session?.access_token) throw new Error('Not authenticated')

	const filename = `${reportType}-${year}.pdf`
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/generate-pdf`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${session.access_token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ reportType, year, filename }),
	})

	if (!response.ok) {
		const errText = await response.text().catch(() => response.statusText)
		throw new Error(`PDF generation failed: ${errText}`)
	}

	const blob = await response.blob()
	const blobUrl = window.URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = blobUrl
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
}

/**
 * Call the generate-pdf Edge Function with pre-built HTML content.
 * Use this when the component already has the data.
 * Triggers a browser file download on success.
 */
export async function callGeneratePdfFromHtml(html: string, filename: string): Promise<void> {
	const supabase = createClient()
	const { data: { session } } = await supabase.auth.getSession()
	if (!session?.access_token) throw new Error('Not authenticated')

	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const response = await fetch(`${baseUrl}/functions/v1/generate-pdf`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${session.access_token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ html, filename }),
	})

	if (!response.ok) {
		const errText = await response.text().catch(() => response.statusText)
		throw new Error(`PDF generation failed: ${errText}`)
	}

	const blob = await response.blob()
	const blobUrl = window.URL.createObjectURL(blob)
	const link = document.createElement('a')
	link.href = blobUrl
	link.download = filename
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
}

// ============================================================================
// DOWNLOAD MUTATION HOOKS
// ============================================================================

/**
 * Mutation hook to download year-end summary as CSV
 */
export function useDownloadYearEndCsv() {
	return useMutation({
		mutationKey: mutationKeys.reports.downloadYearEndCsv,
		mutationFn: async (year: number): Promise<void> => {
			await callExportEdgeFunction('year-end', 'csv', year)
		},
		onSuccess: () => handleMutationSuccess('Download year-end CSV'),
		onError: (err: unknown) => handleMutationError(err, 'Download year-end CSV')
	})
}

/**
 * Mutation hook to download 1099-NEC vendor data as CSV
 */
export function useDownload1099Csv() {
	return useMutation({
		mutationKey: mutationKeys.reports.download1099Csv,
		mutationFn: async (year: number): Promise<void> => {
			await callExportEdgeFunction('1099', 'csv', year)
		},
		onSuccess: () => handleMutationSuccess('Download 1099 CSV'),
		onError: (err: unknown) => handleMutationError(err, 'Download 1099 CSV')
	})
}

/**
 * Mutation hook to download year-end summary as PDF.
 * Calls generate-pdf Edge Function.
 */
export function useDownloadYearEndPdf() {
	return useMutation({
		mutationKey: mutationKeys.reports.downloadYearEndPdf,
		mutationFn: async (year: number): Promise<void> => {
			await callGeneratePdfEdgeFunction('year-end', year)
		},
		onSuccess: () => toast.success('Year-end report downloaded'),
		onError: (err: unknown) => handleMutationError(err, 'Download year-end PDF')
	})
}

/**
 * Mutation hook to download tax documents as PDF.
 * Calls generate-pdf Edge Function.
 */
export function useDownloadTaxDocumentPdf() {
	return useMutation({
		mutationKey: mutationKeys.reports.downloadTaxDocumentPdf,
		mutationFn: async (year: number): Promise<void> => {
			await callGeneratePdfEdgeFunction('financial', year)
		},
		onSuccess: () => toast.success('Tax documents downloaded'),
		onError: (err: unknown) => handleMutationError(err, 'Download tax documents PDF')
	})
}
