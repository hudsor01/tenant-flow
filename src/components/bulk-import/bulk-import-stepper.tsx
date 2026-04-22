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
import { Upload, FileCheck, CheckCheck, ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import {
	useBulkImportMutation,
	useMountedRef,
	type BulkImportMutationInput
} from './use-bulk-import-mutation'

const logger = createLogger({ component: 'BulkImportStepper' })

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
	const [importProgress, setImportProgress] = useState<ImportProgress | null>(
		null
	)
	const [result, setResult] = useState<BulkImportResult | null>(null)
	// Cumulative totals across initial import + every retry batch. Single-
	// batch totals in `result` alone would hide prior successes from the UI
	// when a retry produced its own partial-success.
	const [cumulative, setCumulative] = useState({
		imported: 0,
		failed: 0,
		totalAttempted: 0
	})
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

	const resetDialog = useCallback(() => {
		setFile(null)
		setResult(null)
		onStepChange('upload')
		setParseResult(null)
		setImportProgress(null)
		setCumulative({ imported: 0, failed: 0, totalAttempted: 0 })
		setRetryCount(0)
	}, [onStepChange])

	// Auto-close only on a first-batch full success. Retries keep the
	// dialog open so the user can see the cumulative-total panel.
	useEffect(() => {
		if (!result) return
		if (retryCount > 0) return
		if (!(result.success && result.imported > 0)) return
		const id = window.setTimeout(() => {
			if (!mountedRef.current) return
			onComplete()
			resetDialog()
		}, 5000)
		return () => window.clearTimeout(id)
	}, [result, retryCount, onComplete, resetDialog, mountedRef])

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

	const handleFileSelect = async (selectedFile: File) => {
		setFile(selectedFile)
		setResult(null)
		setCumulative({ imported: 0, failed: 0, totalAttempted: 0 })
		setRetryCount(0)
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
	}

	const runImport = async (rows: BulkImportMutationInput<T>[]) => {
		setResult(null)
		setImportProgress(null)
		onStepChange('confirm')
		try {
			await bulkImportMutation.mutateAsync(rows)
		} catch (err) {
			logger.debug('mutateAsync threw (handled by onError)', { error: err })
		}
	}

	const handleUpload = async () => {
		if (!parseResult) return
		const validRows = parseResult.rows
			.filter(r => r.parsed !== null)
			.map(r => ({ csvLine: r.row, parsed: r.parsed as T }))
		if (validRows.length === 0) return
		await runImport(validRows)
	}

	// On retry: filter the ORIGINAL parsed rows by CSV line number (stable
	// identifier). Only previously-failed rows rerun; prior successes are
	// not re-inserted.
	const handleRetryFailed = async () => {
		if (!result || !parseResult) return
		const failedCsvLines = new Set(result.errors.map(e => e.row))
		const toRetry = parseResult.rows
			.filter(r => failedCsvLines.has(r.row) && r.parsed !== null)
			.map(r => ({ csvLine: r.row, parsed: r.parsed as T }))
		if (toRetry.length === 0) return
		setRetryCount(n => n + 1)
		await runImport(toRetry)
	}

	const handleBack = () => {
		if (currentStep === 'validate') {
			onStepChange('upload')
			setFile(null)
			setParseResult(null)
			setCumulative({ imported: 0, failed: 0, totalAttempted: 0 })
			setRetryCount(0)
		} else if (currentStep === 'confirm') {
			onStepChange('validate')
			// Clear stale result + progress so the validate step doesn't
			// show ghost counts from the previous attempt.
			setResult(null)
			setImportProgress(null)
		}
	}

	const validRowCount =
		parseResult?.rows.filter(r => r.errors.length === 0).length ?? 0
	const hasErrors = parseResult?.rows.some(r => r.errors.length > 0) ?? false
	const csvMalformed = parseResult?.rows.some(r => r.row === 0) ?? false

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
							csvMalformed={csvMalformed}
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
						cumulative={cumulative}
						retryCount={retryCount}
						parseResult={parseResult}
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
					<Button
						variant="outline"
						onClick={() => {
							onComplete()
							resetDialog()
						}}
					>
						Close
					</Button>
				)}
			</DialogFooter>
		</>
	)
}
