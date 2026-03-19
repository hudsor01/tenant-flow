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
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { ownerDashboardKeys } from '#hooks/api/use-owner-dashboard'
import { createClient } from '#lib/supabase/client'
import { createLogger } from '#lib/frontend-logger'
import type {
	BulkImportResult,
	ParsedRow,
	ImportStep,
	ImportProgress
} from '#types/api-contracts'
import type { PropertyCreate } from '#lib/validation/properties'
import { BulkImportUploadStep } from './bulk-import-upload-step'
import { BulkImportValidateStep } from './bulk-import-validate-step'
import { BulkImportConfirmStep } from './bulk-import-confirm-step'
import { parseAndValidateCSV } from './csv-utils'
import { cn } from '#lib/utils'

const logger = createLogger({ component: 'BulkImportStepper' })

interface BulkImportStepperProps {
	currentStep: ImportStep
	onStepChange: (step: ImportStep) => void
	onComplete: () => void
}

export function BulkImportStepper({
	currentStep,
	onStepChange,
	onComplete
}: BulkImportStepperProps) {
	const [file, setFile] = useState<File | null>(null)
	const [parseResult, setParseResult] = useState<{
		rows: ParsedRow[]
		tooManyRows: boolean
		totalRowCount: number
	} | null>(null)
	const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
	const [result, setResult] = useState<BulkImportResult | null>(null)
	const queryClient = useQueryClient()

	const bulkImportMutation = useMutation({
		mutationFn: async (rows: PropertyCreate[]): Promise<BulkImportResult> => {
			const supabase = createClient()
			const { data: { user } } = await supabase.auth.getUser()
			if (!user) throw new Error('Not authenticated')

			const errors: Array<{ row: number; error: string }> = []
			let succeeded = 0

			for (let i = 0; i < rows.length; i++) {
				const row = rows[i]
				const { error } = await supabase
					.from('properties')
					.insert({ ...row, owner_user_id: user.id })

				if (error) {
					errors.push({ row: i + 1, error: error.message })
				} else {
					succeeded++
				}

				setImportProgress({
					current: i + 1,
					total: rows.length,
					succeeded,
					failed: errors.length,
				})
			}

			return {
				success: errors.length === 0,
				imported: succeeded,
				failed: errors.length,
				errors,
			}
		},
		onSuccess: async (data) => {
			await queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
			await queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
			await queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })

			setResult(data)
			if (data.success && data.imported > 0) {
				setTimeout(() => {
					onComplete()
					resetDialog()
				}, 2000)
			}
		},
		onError: (error) => {
			logger.error('Bulk import failed', { error })
			setImportProgress(null)
		},
	})

	const resetDialog = () => {
		setFile(null)
		setResult(null)
		onStepChange('upload')
		setParseResult(null)
		setImportProgress(null)
	}

	const handleFileSelect = async (selectedFile: File) => {
		setFile(selectedFile)
		setResult(null)
		onStepChange('validate')
		try {
			const text = await selectedFile.text()
			const parsed = parseAndValidateCSV(text)
			setParseResult(parsed)
		} catch (error) {
			logger.error('Failed to parse CSV', { error })
			setParseResult(null)
		}
	}

	const handleUpload = async () => {
		if (!parseResult) return
		const validRows = parseResult.rows
			.filter(r => r.parsed !== null)
			.map(r => r.parsed!)

		if (validRows.length === 0) return

		setResult(null)
		setImportProgress(null)
		onStepChange('confirm')

		try {
			logger.info('Starting bulk import', { rowCount: validRows.length })
			await bulkImportMutation.mutateAsync(validRows)
			logger.info('Bulk import completed successfully')
		} catch (error) {
			logger.error('Bulk import mutation failed', { error })
		}
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

	const validRowCount = parseResult?.rows.filter(r => r.errors.length === 0).length ?? 0
	const hasErrors = parseResult?.rows.some(r => r.errors.length > 0) ?? false

	const triggerCls = cn(
		'w-full rounded-lg p-3 transition-all duration-200 hover:bg-background/80',
		'data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=completed]:bg-success/5'
	)
	const indicatorCls = cn(
		'size-9 rounded-lg transition-all duration-200',
		'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
		'data-[state=completed]:bg-success data-[state=completed]:text-success-foreground',
		'data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground'
	)

	const steps = [
		{ value: 'upload' as const, icon: Upload, title: 'Upload', desc: 'Choose CSV file', hasSep: true },
		{ value: 'validate' as const, icon: FileCheck, title: 'Validate', desc: 'Review data', hasSep: true },
		{ value: 'confirm' as const, icon: CheckCheck, title: 'Confirm', desc: 'Import properties', hasSep: false },
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
									<StepperTitle className="text-sm font-semibold">{step.title}</StepperTitle>
									<StepperDescription className="text-xs">{step.desc}</StepperDescription>
								</div>
							</StepperTrigger>
							{step.hasSep && <StepperSeparator className="mx-2 data-[state=completed]:bg-success" />}
						</StepperItem>
					))}
				</StepperList>

				<StepperContent
					value="upload"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportUploadStep onFileSelect={handleFileSelect} />
				</StepperContent>

				<StepperContent
					value="validate"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					{file && (
						<BulkImportValidateStep file={file} parseResult={parseResult} />
					)}
				</StepperContent>

				<StepperContent
					value="confirm"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportConfirmStep
						isImporting={bulkImportMutation.isPending}
						importProgress={importProgress}
						result={result}
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
						disabled={validRowCount === 0 || hasErrors || (parseResult?.tooManyRows ?? false) || bulkImportMutation.isPending}
						className="gap-2 min-w-32"
					>
						Import {validRowCount} Properties
					</Button>
				)}

				</DialogFooter>
		</>
	)
}
