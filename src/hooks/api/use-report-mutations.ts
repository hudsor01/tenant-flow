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
import { reportMutations } from './query-keys/report-keys'

// ============================================================================
// STANDALONE EDGE FUNCTION HELPER (used by component-level callers)
// ============================================================================

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
		...reportMutations.downloadYearEndCsv(),
		onSuccess: () => handleMutationSuccess('Download year-end CSV'),
		onError: (err) => handleMutationError(err, 'Download year-end CSV')
	})
}

/**
 * Mutation hook to download 1099-NEC vendor data as CSV
 */
export function useDownload1099Csv() {
	return useMutation({
		...reportMutations.download1099Csv(),
		onSuccess: () => handleMutationSuccess('Download 1099 CSV'),
		onError: (err) => handleMutationError(err, 'Download 1099 CSV')
	})
}

/**
 * Mutation hook to download year-end summary as PDF.
 * Calls generate-pdf Edge Function.
 */
export function useDownloadYearEndPdf() {
	return useMutation({
		...reportMutations.downloadYearEndPdf(),
		onSuccess: () => toast.success('Year-end report downloaded'),
		onError: (err) => handleMutationError(err, 'Download year-end PDF')
	})
}

/**
 * Mutation hook to download tax documents as PDF.
 * Calls generate-pdf Edge Function.
 */
export function useDownloadTaxDocumentPdf() {
	return useMutation({
		...reportMutations.downloadTaxDocumentPdf(),
		onSuccess: () => toast.success('Tax documents downloaded'),
		onError: (err) => handleMutationError(err, 'Download tax documents PDF')
	})
}
