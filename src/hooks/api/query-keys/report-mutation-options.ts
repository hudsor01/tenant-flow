/**
 * Report Mutation Options
 * mutationOptions() factories for report downloads and exports.
 *
 * Factories contain ONLY mutationKey + mutationFn.
 * onSuccess/onError/onSettled remain in the hook files.
 */

import { mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { mutationKeys } from '../mutation-keys'

// ============================================================================
// EDGE FUNCTION HELPERS
// ============================================================================

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

	const disposition = response.headers.get('Content-Disposition') ?? ''
	const filenameMatch = disposition.match(/filename="([^"]+)"/)
	link.download = filenameMatch?.[1] ?? `${reportType}-${year}.${format}`

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100)
	return true
}

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

// ============================================================================
// MUTATION OPTIONS FACTORIES
// ============================================================================

export const reportMutations = {
	downloadYearEndCsv: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadYearEndCsv,
			mutationFn: async (year: number): Promise<void> => {
				await callExportEdgeFunction('year-end', 'csv', year)
			}
		}),

	download1099Csv: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.download1099Csv,
			mutationFn: async (year: number): Promise<void> => {
				await callExportEdgeFunction('1099', 'csv', year)
			}
		}),

	downloadYearEndPdf: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadYearEndPdf,
			mutationFn: async (year: number): Promise<void> => {
				await callGeneratePdfEdgeFunction('year-end', year)
			}
		}),

	downloadTaxDocumentPdf: () =>
		mutationOptions({
			mutationKey: mutationKeys.reports.downloadTaxDocumentPdf,
			mutationFn: async (year: number): Promise<void> => {
				await callGeneratePdfEdgeFunction('financial', year)
			}
		})
}
