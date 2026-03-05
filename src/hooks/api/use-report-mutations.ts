/**
 * Report Mutation Hooks
 * Edge Function helpers and download/export mutation hooks for reports.
 *
 * Split from use-reports.ts to keep each file under 300 lines.
 * Query hooks remain in use-reports.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '#lib/supabase/client'
import {
	handleMutationError,
	handleMutationSuccess
} from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

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
