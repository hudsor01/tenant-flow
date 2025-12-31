'use client'

import * as React from 'react'
import { apiRequest, apiRequestRaw } from '#lib/api-request'
import { toast } from 'sonner'
import type { TemplatePreviewOptions } from './template-types'

const previewSuccessMessage = 'PDF preview generated'
const exportSuccessMessage = 'Document PDF exported'

export function useTemplatePdf(
	template: string,
	getPayload: () => TemplatePreviewOptions
) {
	const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
	const [isGeneratingPreview, setIsGeneratingPreview] =
		React.useState(false)
	const [isExporting, setIsExporting] = React.useState(false)

	React.useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
		}
	}, [previewUrl])

	const handlePreview = React.useCallback(async () => {
		setIsGeneratingPreview(true)
		try {
			const payload = getPayload()
			const response = await apiRequestRaw(
				`/documents/templates/${template}/preview`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(payload)
				}
			)

			const blob = await response.blob()
			const url = URL.createObjectURL(blob)
			setPreviewUrl(prev => {
				if (prev) {
					URL.revokeObjectURL(prev)
				}
				return url
			})
			toast.success(previewSuccessMessage)
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to generate PDF preview'
			toast.error(message)
		} finally {
			setIsGeneratingPreview(false)
		}
	}, [getPayload, template])

	const handleExport = React.useCallback(async () => {
		setIsExporting(true)
		try {
			const payload = getPayload()
			const response = await apiRequest<{ downloadUrl?: string }>(
				`/documents/templates/${template}/export`,
				{
					method: 'POST',
					body: JSON.stringify(payload)
				}
			)

			if (!response.downloadUrl) {
				throw new Error('Export failed to return a download URL')
			}

			window.open(response.downloadUrl, '_blank', 'noopener,noreferrer')
			toast.success(exportSuccessMessage)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to export PDF'
			toast.error(message)
		} finally {
			setIsExporting(false)
		}
	}, [getPayload, template])

	return {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	}
}
