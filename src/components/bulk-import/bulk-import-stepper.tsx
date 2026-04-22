'use client'

import { Button } from '#components/ui/button'
import { DialogFooter } from '#components/ui/dialog'
import {
	Root as StepperRoot,
	List as StepperList,
	Item as StepperItem,
	Trigger as StepperTrigger,
	Indicator as StepperIndicator,
	Separator as StepperSeparator,
	Title as StepperTitle,
	Description as StepperDescription,
	Content as StepperContent
} from '#components/ui/stepper'
import {
	Upload,
	FileCheck,
	CheckCheck,
	ArrowLeft
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '#lib/frontend-logger'
import type {
	BulkImportResult,
	ImportStep,
	ImportProgress,
	ParsedRow
} from '#types/api-contracts'
import { BulkImportUploadStep } from './bulk-import-upload-step'
import { BulkImportValidateStep } from './bulk-import-validate-step'
import { BulkImportConfirmStep } from './bulk-import-confirm-step'
import { cn } from '#lib/utils'
import type { BulkImportConfig } from './types'

const logger = createLogger({ component: 'BulkImportStepper' })

// Flush progress at most every ~120 ms of wall-clock + every 5 rows to avoid
// the 100-re-render storm when a user imports 100 rows back-to-back.
const PROGRESS_BATCH_EVERY_ROWS = 5
const PROGRESS_BATCH_EVERY_MS = 120

interface BulkImportStepperProps<T> {
	config: BulkImportConfig<T>
	currentStep: ImportStep
	onStepChange: (step: ImportStep) => void
	onComplete: () => void
	onPendingChange?: (pending: boolean) => void
}

export function BulkImportStepper<T>({
	config,
	currentStep,
	onStepChange,
	onComplete,
	onPendingChange
}: BulkImportStepperProps<T>) {
	const [file, setFile] = useState<File | null>(null)
	const [parseResult, setParseResult] = useState<{
		rows: ParsedRow<T>[]
		tooManyRows: boolean
		totalRowCount: number
	} | null>(null)
	const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
	const [result, setResult] = useState<BulkImportResult | null>(null)
	const queryClient = useQueryClient()
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	const bulkImportMutation = useMutation({
		mutationFn: async (rows: T[]): Promise<BulkImportResult> => {
			const errors: Array<{ row: number; error: string }> = []
			let succeeded = 0
			let lastFlush = Date.now()

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i] as T
				const { error } = await config.insertRow(row)

				if (error) {
					errors.push({ row: i + 1, error: error.message })
				} else {
					succeeded++
				}

				const now = Date.now()
				const isLast = i === rows.length - 1
				const hitRowBatch = (i + 1) % PROGRESS_BATCH_EVERY_ROWS === 0
				const hitTimeBatch = now - lastFlush >= PROGRESS_BATCH_EVERY_MS
				if (isLast || hitRowBatch || hitTimeBatch) {
					if (mountedRef.current) {
						setImportProgress({
							current: i + 1,
							total: rows.length,
							succeeded,
							failed: errors.length
						})
					}
					lastFlush = now
				}
			}

			return {
				success: errors.length === 0,
				imported: succeeded,
				failed: errors.length,
				errors
			}
		},
		onSuccess: async data => {
			for (const key of config.invalidateKeys) {
				await queryClient.invalidateQueries({ queryKey: key })
			}

			if (!mountedRef.current) return
			setResult(data)
			// Only auto-close on full success. Partial success or failure keeps
			// the dialog open so the user can read per-row errors and decide
			// whether to retry. 5 s gives enough time to read the success badge.
			if (data.success && data.imported > 0) {
				setTimeout(() => {
					if (!mountedRef.current) return
					onComplete()
					resetDialog()
				}, 5000)
			}
		},
		onError: error => {
			logger.error('Bulk import failed', {
				error,
				entity: config.entityLabel.plural
			})
			if (mountedRef.current) setImportProgress(null)
		}
	})

	// Lift pending state so the dialog can block close-during-import without
	// reaching into mutation internals.
	useEffect(() => {
		onPendingChange?.(bulkImportMutation.isPending)
	}, [bulkImportMutation.isPending, onPendingChange])

	const resetDialog = useCallback(() => {
		setFile(null)
		setResult(null)
		onStepChange('upload')
		setParseResult(null)
		setImportProgress(null)
	}, [onStepChange])

	const handleFileSelect = async (selectedFile: File) => {
		setFile(selectedFile)
		setResult(null)
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
		}
	}

	const runImport = async (rows: T[]) => {
		setResult(null)
		setImportProgress(null)
		onStepChange('confirm')
		try {
			logger.info('Starting bulk import', {
				rowCount: rows.length,
				entity: config.entityLabel.plural
			})
			await bulkImportMutation.mutateAsync(rows)
			logger.info('Bulk import completed', {
				entity: config.entityLabel.plural
			})
		} catch (error) {
			logger.error('Bulk import mutation failed', { error })
		}
	}

	const handleUpload = async () => {
		if (!parseResult) return
		const validRows = parseResult.rows
			.filter(r => r.parsed !== null)
			.map(r => r.parsed as T)

		if (validRows.length === 0) return
		await runImport(validRows)
	}

	const handleRetryFailed = async () => {
		if (!result || !parseResult) return
		// Map the row indices the mutation reported failing back to the
		// parsed rows and retry those specifically. This is a user-visible
		// path so correctness matters — we use the `row` number rather than
		// array index in case anything re-ordered.
		const failedRowNumbers = new Set(result.errors.map(e => e.row))
		const toRetry = parseResult.rows
			.filter((r, idx) => failedRowNumbers.has(idx + 1) && r.parsed !== null)
			.map(r => r.parsed as T)

		if (toRetry.length === 0) return
		await runImport(toRetry)
	}

	const handleBack = () => {
		if (currentStep === 'validate') {
			onStepChange('upload')
			setFile(null)
			setParseResult(null)
		} else if (currentStep === 'confirm') {
			onStepChange('validate')
		}
	}

	const validRowCount =
		parseResult?.rows.filter(r => r.errors.length === 0).length ?? 0
	const hasErrors = parseResult?.rows.some(r => r.errors.length > 0) ?? false

	const triggerCls = cn(
		'w-full rounded-lg p-3 transition-all duration-200 hover:bg-muted/60',
		'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=completed]:bg-success/5'
	)
	const indicatorCls = cn(
		'size-9 rounded-lg transition-all duration-200',
		'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
		'data-[state=completed]:bg-success data-[state=completed]:text-success-foreground',
		'data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground'
	)

	const steps = [
		{
			value: 'upload' as const,
			icon: Upload,
			title: 'Upload',
			desc: 'Choose CSV file',
			hasSep: true
		},
		{
			value: 'validate' as const,
			icon: FileCheck,
			title: 'Validate',
			desc: 'Review data',
			hasSep: true
		},
		{
			value: 'confirm' as const,
			icon: CheckCheck,
			title: 'Confirm',
			desc: `Import ${config.entityLabel.plural.toLowerCase()}`,
			hasSep: false
		}
	]

	return (
		<>
			<StepperRoot value={currentStep} className="w-full">
				<StepperList className="mb-8 p-1 bg-muted/30 rounded-xl">
					{steps.map(step => (
						<StepperItem key={step.value} value={step.value}>
							<StepperTrigger className={triggerCls}>
								<StepperIndicator className={indicatorCls}>
									<step.icon className="size-4" />
								</StepperIndicator>
								<div className="flex flex-col items-start ml-3">
									<StepperTitle className="text-sm font-semibold">
										{step.title}
									</StepperTitle>
									<StepperDescription className="text-xs">
										{step.desc}
									</StepperDescription>
								</div>
							</StepperTrigger>
							{step.hasSep && (
								<StepperSeparator className="mx-2 data-[state=completed]:bg-success" />
							)}
						</StepperItem>
					))}
				</StepperList>

				<StepperContent
					value="upload"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportUploadStep config={config} onFileSelect={handleFileSelect} />
				</StepperContent>

				<StepperContent
					value="validate"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					{file && (
						<BulkImportValidateStep
							file={file}
							parseResult={parseResult}
							templateHeaders={config.templateHeaders}
						/>
					)}
				</StepperContent>

				<StepperContent
					value="confirm"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportConfirmStep
						entityLabel={config.entityLabel}
						isImporting={bulkImportMutation.isPending}
						importProgress={importProgress}
						result={result}
						onRetryFailed={handleRetryFailed}
					/>
				</StepperContent>
			</StepperRoot>

			<DialogFooter className="gap-3 pt-4 border-t border-border/50">
				{currentStep !== 'upload' && !result && (
					<Button
						variant="outline"
						onClick={handleBack}
						disabled={bulkImportMutation.isPending}
						className="gap-2 hover:bg-muted/50"
					>
						<ArrowLeft className="size-4" />
						{currentStep === 'validate' ? 'Back' : 'Cancel'}
					</Button>
				)}

				{currentStep === 'validate' && (
					<Button
						onClick={handleUpload}
						disabled={
							validRowCount === 0 ||
							hasErrors ||
							(parseResult?.tooManyRows ?? false) ||
							bulkImportMutation.isPending
						}
						className="gap-2 min-w-32"
					>
						Import {validRowCount} {config.entityLabel.plural}
					</Button>
				)}

				{currentStep === 'confirm' && result && (
					<Button variant="outline" onClick={() => { onComplete(); resetDialog() }}>
						Close
					</Button>
				)}
			</DialogFooter>
		</>
	)
}
