'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { safeDom } from '#lib/dom-utils'
import { createClient } from '#lib/supabase/client'
import { API_BASE_URL } from '#lib/api-config'
import { handleMutationError } from '#lib/mutation-error-handler'

type ExportFormat = 'excel' | 'pdf' | 'csv'

type ExportButtonsProps = {
	filename: string
	payload: unknown
}

const formatConfig: Record<
	ExportFormat,
	{ label: string; icon: ComponentType<{ className?: string }> }
> = {
	excel: { label: 'Excel', icon: FileSpreadsheet },
	pdf: { label: 'PDF', icon: FileText },
	csv: { label: 'CSV', icon: Download }
}

async function fetchAccessToken(): Promise<string | null> {
	const supabase = createClient()

	// SECURITY FIX: Validate user with getUser() before extracting token
	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (userError || !user) {
		return null
	}

	// Get session for access token (only after user validation)
	const {
		data: { session }
	} = await supabase.auth.getSession()
	return session?.access_token ?? null
}

async function requestExport(
	format: ExportFormat,
	filename: string,
	payload: unknown
) {
	const token = await fetchAccessToken()

	if (!token) {
		throw new Error('You need to be signed in to export analytics data.')
	}

	const response = await fetch(`${API_BASE_URL}/reports/export/${format}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			filename,
			payload,
			sheetName: 'Financial Analytics',
			title: 'Financial Analytics Export'
		})
	})

	if (!response.ok) {
		const { ApiErrorCode, createApiErrorFromResponse } = await import(
			'@repo/shared/utils/api-error'
		)
		throw createApiErrorFromResponse(
			response,
			ApiErrorCode.FINANCIAL_EXPORT_FAILED
		)
	}

	const blob = await response.blob()
	const disposition = response.headers.get('Content-Disposition')
	const downloadName =
		disposition?.split('filename=')[1]?.replace(/"/g, '') ||
		`${filename}.${format === 'excel' ? 'xlsx' : format}`

	const url = URL.createObjectURL(blob)
	const anchor = safeDom.createElement('a', {
		attributes: {
			href: url,
			download: downloadName
		}
	})
	if (anchor) {
		safeDom.appendToBody(anchor)
		anchor.click()
		safeDom.removeFromBody(anchor)
		setTimeout(() => URL.revokeObjectURL(url), 100)
	} else {
		URL.revokeObjectURL(url)
	}
}

export function ExportButtons({ filename, payload }: ExportButtonsProps) {
	const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null)

	const handleExport = async (format: ExportFormat) => {
		setLoadingFormat(format)
		try {
			await requestExport(format, filename, payload)
			toast.success(`Exported ${formatConfig[format].label}`)
		} catch (error) {
			handleMutationError(error, `Export ${formatConfig[format].label}`)
		} finally {
			setLoadingFormat(null)
		}
	}

	return (
		<div className="flex flex-wrap gap-2">
			{(Object.keys(formatConfig) as ExportFormat[]).map(format => {
				const { label, icon: Icon } = formatConfig[format]
				return (
					<Button
						key={format}
						variant="outline"
						size="sm"
						onClick={() => handleExport(format)}
						disabled={loadingFormat !== null}
					>
						<Icon className="mr-2 size-4" />
						{loadingFormat === format ? 'Exporting…' : `Export ${label}`}
					</Button>
				)
			})}
		</div>
	)
}
