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
	ArrowLeft,
	Loader2,
	Building2
} from 'lucide-react'
import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useModalStore } from '#stores/modal-store'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { apiRequestFormData } from '#lib/api-request'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type {
	BulkImportStepperProps,
	BulkImportResult,
	ParsedRow
} from '@repo/shared/types/bulk-import'
import { BulkImportUploadStep } from './bulk-import-upload-step'
import { BulkImportValidateStep } from './bulk-import-validate-step'
import { BulkImportConfirmStep } from './bulk-import-confirm-step'
import { parseCSVFile } from './csv-utils'
import { cn } from '#lib/utils'

const logger = createLogger({ component: 'BulkImportStepper' })

export function BulkImportStepper({
	currentStep,
	onStepChange,
	modalId
}: BulkImportStepperProps) {
	const [file, setFile] = useState<File | null>(null)
	const [parsedData, setParsedData] = useState<ParsedRow[]>([])
	const [uploadProgress, setUploadProgress] = useState(0)
	const [result, setResult] = useState<BulkImportResult | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const queryClient = useQueryClient()
	const { trackMutation, closeOnMutationSuccess } = useModalStore()

	const bulkImportMutation = useMutation({
		mutationFn: async (uploadFile: File) => {
			const formData = new FormData()
			formData.append('file', uploadFile)

			// Simulate progress for better UX
			setUploadProgress(0)
			const progressInterval = setInterval(() => {
				setUploadProgress(prev => Math.min(prev + 10, 90))
			}, 200)

			try {
				const result = await apiRequestFormData<BulkImportResult>(
					'/api/v1/properties/bulk-import',
					formData
				)
				clearInterval(progressInterval)
				setUploadProgress(100)
				return result
			} catch (error) {
				clearInterval(progressInterval)
				throw error
			}
		},
		onSuccess: async data => {
			await queryClient.invalidateQueries({ queryKey: propertyQueries.all() })

			if (data.success && data.imported > 0) {
				setResult(data)
				setTimeout(() => {
					closeOnMutationSuccess(modalId)
					resetDialog()
				}, 2000)
			} else {
				setResult(data)
			}
		},
		onError: error => {
			logger.error('Bulk import failed', { error })
			setUploadProgress(0)
		}
	})

	const resetDialog = useCallback(() => {
		setFile(null)
		setResult(null)
		onStepChange('upload')
		setParsedData([])
		setUploadProgress(0)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}, [onStepChange])

	const handleFileSelect = useCallback(
		async (selectedFile: File) => {
			setFile(selectedFile)
			setResult(null)
			onStepChange('validate')

			try {
				const parsed = await parseCSVFile(selectedFile)
				setParsedData(parsed)
			} catch (error) {
				logger.error('Failed to parse CSV', { error })
				setParsedData([])
			}
		},
		[onStepChange]
	)

	const handleUpload = async () => {
		if (!file) return

		setResult(null)
		onStepChange('confirm')

		try {
			logger.info('Starting bulk import', { fileName: file.name })
			trackMutation(modalId, 'bulk-import-properties', queryClient)
			await bulkImportMutation.mutateAsync(file)
			logger.info('Bulk import initiated successfully')
		} catch (error) {
			logger.error('Bulk import mutation failed', { error })
		}
	}

	const handleBack = () => {
		if (currentStep === 'validate') {
			onStepChange('upload')
			setFile(null)
			setParsedData([])
		} else if (currentStep === 'confirm') {
			onStepChange('validate')
		}
	}

	const validRowCount = parsedData.filter(row => row.errors.length === 0).length

	return (
		<>
			<StepperRoot value={currentStep} className="w-full">
				{/* Enhanced Stepper List */}
				<StepperList className="mb-8 p-1 bg-muted/30 rounded-xl">
					<StepperItem value="upload">
						<StepperTrigger
							className={cn(
								'w-full rounded-lg p-3 transition-all duration-200',
								'hover:bg-background/80',
								'data-[state=active]:bg-background data-[state=active]:shadow-sm',
								'data-[state=completed]:bg-success/5'
							)}
						>
							<StepperIndicator
								className={cn(
									'size-9 rounded-lg transition-all duration-200',
									'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
									'data-[state=completed]:bg-success data-[state=completed]:text-success-foreground',
									'data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground'
								)}
							>
								<Upload className="size-4" />
							</StepperIndicator>
							<div className="flex flex-col items-start ml-3">
								<StepperTitle className="text-sm font-semibold">
									Upload
								</StepperTitle>
								<StepperDescription className="text-xs">
									Choose CSV file
								</StepperDescription>
							</div>
						</StepperTrigger>
						<StepperSeparator className="mx-2 data-[state=completed]:bg-success" />
					</StepperItem>

					<StepperItem value="validate">
						<StepperTrigger
							className={cn(
								'w-full rounded-lg p-3 transition-all duration-200',
								'hover:bg-background/80',
								'data-[state=active]:bg-background data-[state=active]:shadow-sm',
								'data-[state=completed]:bg-success/5'
							)}
						>
							<StepperIndicator
								className={cn(
									'size-9 rounded-lg transition-all duration-200',
									'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
									'data-[state=completed]:bg-success data-[state=completed]:text-success-foreground',
									'data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground'
								)}
							>
								<FileCheck className="size-4" />
							</StepperIndicator>
							<div className="flex flex-col items-start ml-3">
								<StepperTitle className="text-sm font-semibold">
									Validate
								</StepperTitle>
								<StepperDescription className="text-xs">
									Review data
								</StepperDescription>
							</div>
						</StepperTrigger>
						<StepperSeparator className="mx-2 data-[state=completed]:bg-success" />
					</StepperItem>

					<StepperItem value="confirm">
						<StepperTrigger
							className={cn(
								'w-full rounded-lg p-3 transition-all duration-200',
								'hover:bg-background/80',
								'data-[state=active]:bg-background data-[state=active]:shadow-sm',
								'data-[state=completed]:bg-success/5'
							)}
						>
							<StepperIndicator
								className={cn(
									'size-9 rounded-lg transition-all duration-200',
									'data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md',
									'data-[state=completed]:bg-success data-[state=completed]:text-success-foreground',
									'data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground'
								)}
							>
								<CheckCheck className="size-4" />
							</StepperIndicator>
							<div className="flex flex-col items-start ml-3">
								<StepperTitle className="text-sm font-semibold">
									Confirm
								</StepperTitle>
								<StepperDescription className="text-xs">
									Import properties
								</StepperDescription>
							</div>
						</StepperTrigger>
					</StepperItem>
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
						<BulkImportValidateStep file={file} parsedData={parsedData} />
					)}
				</StepperContent>

				<StepperContent
					value="confirm"
					className="animate-in fade-in slide-in-from-right-4 duration-300"
				>
					<BulkImportConfirmStep
						isImporting={bulkImportMutation.isPending}
						uploadProgress={uploadProgress}
						result={result}
					/>
				</StepperContent>
			</StepperRoot>

			{/* Enhanced Dialog Footer */}
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
						onClick={() => onStepChange('confirm')}
						disabled={validRowCount === 0}
						className="gap-2 min-w-32"
					>
						Continue
						{validRowCount > 0 && (
							<span className="bg-primary-foreground/20 px-2 py-0.5 rounded text-xs">
								{validRowCount} valid
							</span>
						)}
					</Button>
				)}

				{currentStep === 'confirm' && !result && (
					<Button
						onClick={handleUpload}
						disabled={!file || bulkImportMutation.isPending}
						className="gap-2 min-w-40"
					>
						{bulkImportMutation.isPending ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Importing...
							</>
						) : (
							<>
								<Building2 className="size-4" />
								Import Properties
							</>
						)}
					</Button>
				)}
			</DialogFooter>
		</>
	)
}
