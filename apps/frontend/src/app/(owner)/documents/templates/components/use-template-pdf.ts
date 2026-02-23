'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { TemplatePreviewOptions } from './template-types'

/** Debounce delay in milliseconds for preview generation */
const PREVIEW_DEBOUNCE_MS = 500

export function useTemplatePdf(
	_template: string,
	_getPayload: () => TemplatePreviewOptions
) {
	const [previewUrl, _setPreviewUrl] = useState<string | null>(null)
	const [isGeneratingPreview, setIsGeneratingPreview] =
		useState(false)
	const [isExporting, setIsExporting] = useState(false)
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		return () => {
			if (previewUrl) {
				URL.revokeObjectURL(previewUrl)
			}
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		}
	}, [previewUrl])

	const handlePreview = useCallback(async () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}

		debounceTimerRef.current = setTimeout(async () => {
			setIsGeneratingPreview(true)
			try {
				// TODO(phase-57): PDF preview requires StirlingPDF Edge Function integration
				// The NestJS backend /documents/templates/:template/preview has been removed.
				throw new Error('PDF preview requires StirlingPDF Edge Function implementation')
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: 'Failed to generate PDF preview'
				toast.error(message)
			} finally {
				setIsGeneratingPreview(false)
			}
		}, PREVIEW_DEBOUNCE_MS)
	}, [])

	const handleExport = useCallback(async () => {
		setIsExporting(true)
		try {
			// TODO(phase-57): PDF export requires StirlingPDF Edge Function integration
			// The NestJS backend /documents/templates/:template/export has been removed.
			throw new Error('PDF export requires StirlingPDF Edge Function implementation')
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to export PDF'
			toast.error(message)
		} finally {
			setIsExporting(false)
		}
	}, [])

	return {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	}
}
