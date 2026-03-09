'use client'

import { useEffect, useRef, useState } from 'react'
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

	const handlePreview = async () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}

		debounceTimerRef.current = setTimeout(async () => {
			setIsGeneratingPreview(true)
			try {
				toast.info('PDF preview is not yet available')
			} finally {
				setIsGeneratingPreview(false)
			}
		}, PREVIEW_DEBOUNCE_MS)
	}

	const handleExport = async () => {
		setIsExporting(true)
		try {
			toast.info('PDF export is not yet available')
		} finally {
			setIsExporting(false)
		}
	}

	return {
		previewUrl,
		isGeneratingPreview,
		isExporting,
		handlePreview,
		handleExport
	}
}
