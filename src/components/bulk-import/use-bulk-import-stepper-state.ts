'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createLogger } from '#lib/frontend-logger'
import type {
	BulkImportResult,
	ImportProgress,
	ImportStep,
	ParsedRow
} from '#types/api-contracts'
import type { BulkImportConfig } from './types'
import {
	useBulkImportMutation,
	useMountedRef,
	type BulkImportMutationInput
} from './use-bulk-import-mutation'

const logger = createLogger({ component: 'useBulkImportStepperState' })

const ZERO_CUMULATIVE = { imported: 0, failed: 0, totalAttempted: 0 }

interface UseBulkImportStepperStateArgs<T> {
	config: BulkImportConfig<T>
	currentStep: ImportStep
	onStepChange: (step: ImportStep) => void
	onComplete: () => void
	onPendingChange?: (pending: boolean) => void
}

// Owns the full bulk-import lifecycle: file parse, validation,
// mutation runs, retry filtering by CSV line, cumulative-totals
// tracking. Returned from this hook so the BulkImportStepper
// component stays under the 300-line cap.
export function useBulkImportStepperState<T>({
	config,
	currentStep,
	onStepChange,
	onComplete,
	onPendingChange
}: UseBulkImportStepperStateArgs<T>) {
	const [file, setFile] = useState<File | null>(null)
	const [parseResult, setParseResult] = useState<{
		rows: ParsedRow<T>[]
		tooManyRows: boolean
		totalRowCount: number
	} | null>(null)
	const [importProgress, setImportProgress] = useState<ImportProgress | null>(
		null
	)
	const [result, setResult] = useState<BulkImportResult | null>(null)
	// Cumulative totals across initial import + every retry batch. Single-
	// batch totals in `result` alone would hide prior successes from the UI
	// when a retry produced its own partial-success.
	const [cumulative, setCumulative] = useState(ZERO_CUMULATIVE)
	// Retries disable the auto-close so the user can read cumulative totals.
	const [retryCount, setRetryCount] = useState(0)
	const mountedRef = useMountedRef()

	const bulkImportMutation = useBulkImportMutation<T>({
		config,
		setImportProgress,
		setResult,
		mountedRef
	})

	useEffect(() => {
		onPendingChange?.(bulkImportMutation.isPending)
	}, [bulkImportMutation.isPending, onPendingChange])

	// Auto-close only on a first-batch full success.
	useEffect(() => {
		if (!result) return
		if (retryCount > 0) return
		if (!(result.success && result.imported > 0)) return
		const id = window.setTimeout(() => {
			if (!mountedRef.current) return
			onComplete()
		}, 5000)
		return () => window.clearTimeout(id)
	}, [result, retryCount, onComplete, mountedRef])

	// Keep cumulative counters in sync with each mutation result.
	useEffect(() => {
		if (!result) return
		setCumulative(prev => ({
			imported: prev.imported + result.imported,
			// Only the most recent batch's failures remain outstanding;
			// previously-retried-and-fixed rows are gone from this count.
			failed: result.failed,
			totalAttempted: prev.totalAttempted + result.imported + result.failed
		}))
	}, [result])

	const resetImportState = useCallback(() => {
		setCumulative(ZERO_CUMULATIVE)
		setRetryCount(0)
	}, [])

	const handleFileSelect = useCallback(
		async (selectedFile: File) => {
			setFile(selectedFile)
			setResult(null)
			resetImportState()
			onStepChange('validate')
			try {
				const text = await selectedFile.text()
				const parsed = config.parseAndValidate(text)
				setParseResult(parsed)
			} catch (error) {
				logger.error('Failed to parse CSV', {
					error,
					entity: config.entityLabel.plural
				})
				setParseResult(null)
				toast.error('Failed to read CSV file', {
					description: 'Check the file is a valid CSV and not corrupted.'
				})
			}
		},
		[config, onStepChange, resetImportState]
	)

	const runImport = useCallback(
		async (rows: BulkImportMutationInput<T>[]) => {
			setResult(null)
			setImportProgress(null)
			onStepChange('confirm')
			try {
				await bulkImportMutation.mutateAsync(rows)
			} catch (err) {
				logger.debug('mutateAsync threw (handled by onError)', { error: err })
			}
		},
		[bulkImportMutation, onStepChange]
	)

	const handleUpload = useCallback(async () => {
		if (!parseResult) return
		const validRows = parseResult.rows
			.filter(r => r.parsed !== null)
			.map(r => ({ csvLine: r.row, parsed: r.parsed as T }))
		if (validRows.length === 0) return
		await runImport(validRows)
	}, [parseResult, runImport])

	// On retry: filter the ORIGINAL parsed rows by CSV line number (stable
	// identifier). Only previously-failed rows rerun; prior successes are
	// not re-inserted.
	const handleRetryFailed = useCallback(async () => {
		if (!result || !parseResult) return
		const failedCsvLines = new Set(result.errors.map(e => e.row))
		const toRetry = parseResult.rows
			.filter(r => failedCsvLines.has(r.row) && r.parsed !== null)
			.map(r => ({ csvLine: r.row, parsed: r.parsed as T }))
		if (toRetry.length === 0) return
		setRetryCount(n => n + 1)
		await runImport(toRetry)
	}, [result, parseResult, runImport])

	const handleBack = useCallback(() => {
		if (currentStep === 'validate') {
			onStepChange('upload')
			setFile(null)
			setParseResult(null)
			resetImportState()
		} else if (currentStep === 'confirm') {
			onStepChange('validate')
			// Clear stale result + progress + cumulative so the validate
			// step doesn't show ghost counts from the previous attempt.
			// (Today this branch is unreachable while a mutation is
			// in-flight because the Cancel button is disabled, but reset
			// unconditionally so the invariant is not timing-dependent.)
			setResult(null)
			setImportProgress(null)
			resetImportState()
		}
	}, [currentStep, onStepChange, resetImportState])

	const validRowCount =
		parseResult?.rows.filter(r => r.errors.length === 0).length ?? 0
	const hasErrors = parseResult?.rows.some(r => r.errors.length > 0) ?? false
	const csvMalformed = parseResult?.rows.some(r => r.row === 0) ?? false

	return {
		file,
		parseResult,
		importProgress,
		result,
		cumulative,
		retryCount,
		isImporting: bulkImportMutation.isPending,
		validRowCount,
		hasErrors,
		csvMalformed,
		handleFileSelect,
		handleUpload,
		handleRetryFailed,
		handleBack
	}
}
