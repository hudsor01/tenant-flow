'use client'

import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { clientFetch } from '#lib/api/client'
import { ApiErrorCode, isApiError } from '#lib/api/api-error'
import { BUSINESS_ERROR_CODES } from '@repo/shared/types/api-errors'
import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useModalStore } from '#stores/modal-store'
import { propertyQueries } from '#hooks/api/queries/property-queries'

const logger = createLogger({ component: 'PropertyBulkImportDialog' })
const CSV_TEMPLATE_HEADERS = [
	'name',
	'address',
	'city',
	'state',
	'zipCode',
	'propertyType',
	'description'
] as const
const CSV_TEMPLATE_SAMPLE_ROWS = [
	[
		'Sample Property 1',
		'123 Main St',
		'San Francisco',
		'CA',
		'94105',
		'APARTMENT',
		'Modern apartment building'
	],
	[
		'Sample Property 2',
		'456 Oak Ave',
		'Los Angeles',
		'CA',
		'90001',
		'SINGLE_FAMILY',
		'Single family home'
	]
] as const
const CSV_ACCEPTED_MIME_TYPES = ['text/csv', 'application/csv']
const CSV_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const CSV_TEMPLATE_FILENAME = 'property-import-template.csv'

type BulkImportResult = {
	success: boolean
	imported: number
	failed: number
	errors: Array<{ row: number; error: string }>
}

export function PropertyBulkImportDialog() {
	const {
		openModal,
		closeModal,
		isModalOpen,
		trackMutation,
		closeOnMutationSuccess
	} = useModalStore()
	const [file, setFile] = useState<File | null>(null)
	const queryClient = useQueryClient()
	const [result, setResult] = useState<BulkImportResult | null>(null)

	const bulkImportMutation = useMutation({
		mutationFn: async (uploadFile: File) => {
			const formData = new FormData()
			formData.append('file', uploadFile)

			return clientFetch<BulkImportResult>('/api/v1/properties/bulk-import', {
				method: 'POST',
				body: formData,
				omitJsonContentType: true
			})
		},
		onSuccess: async (data) => {
			// Invalidate and refetch properties immediately
			await queryClient.invalidateQueries({ queryKey: propertyQueries.all() })

			// If successful, set result and let UI show success message
			if (data.success && data.imported > 0) {
				setResult(data)
				// Close modal after showing success briefly
				setTimeout(() => {
					closeOnMutationSuccess('bulk-import-properties')
					setFile(null)
					setResult(null)
				}, 2000)
			} else {
				setResult(data)
			}
		},
		onError: (error) => {
			logger.error('Bulk import failed', { error })
			const errorMessage = getErrorMessage(error)
			alert(errorMessage)
		}
	})

	const modalId = 'bulk-import-properties'
	const isOpen = isModalOpen(modalId)

	const handleOpenModal = () => {
		openModal(
			modalId,
			{},
			{
				type: 'dialog',
				size: 'lg',
				animationVariant: 'fade',
				closeOnOutsideClick: true,
				closeOnEscape: true
			}
		)
	}

	const handleCloseModal = () => {
		closeModal(modalId)
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			handleCloseModal()
		}
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			const validationError = getFileValidationError(selectedFile)
			if (validationError) {
				logger.warn('Invalid CSV file selected', {
					type: selectedFile.type,
					size: selectedFile.size,
					validationError
				})
				alert(validationError)
				return
			}

			setFile(selectedFile)
			setResult(null)
		}
	}

	const handleUpload = async () => {
		if (!file) return

		setResult(null)

		try {
			logger.info('Starting bulk import', { fileName: file.name })

			// Track the mutation for auto-close
			trackMutation(modalId, 'bulk-import-properties', queryClient)

			// Mutation handles success/error via onSuccess/onError callbacks
			await bulkImportMutation.mutateAsync(file)

			logger.info('Bulk import initiated successfully')
		} catch (error) {
			// Error already logged in onError callback
			logger.error('Bulk import mutation failed', { error })
		}
	}

	const downloadTemplate = () => {
		const csvContent = buildCsvTemplate(CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_SAMPLE_ROWS)
		triggerCsvDownload(csvContent, CSV_TEMPLATE_FILENAME)
		logger.info('CSV template downloaded')
	}

	return (
		<>
			<Button variant="outline" onClick={handleOpenModal}>
				<Upload className="size-4 mr-2" />
				Bulk Import
			</Button>

			<Dialog open={isOpen} onOpenChange={handleOpenChange}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Import Properties</DialogTitle>
						<DialogDescription>
							Upload a CSV file to add multiple properties at once.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* File Upload Section */}
						<div className="space-y-3">
							<div className="space-y-2">
								<label htmlFor="file-upload" className="text-sm font-medium">
									Choose CSV File
								</label>
								<input
									id="file-upload"
									type="file"
									accept=".csv,text/csv"
									onChange={handleFileChange}
									className="block w-full text-sm text-muted-foreground
									file:mr-4 file:py-2 file:px-4
									file:rounded-md file:border-0
									file:text-sm file:font-semibold
									file:bg-primary file:text-primary-foreground
									hover:file:bg-primary/90
									cursor-pointer"
								/>
								{file && (
									<p className="text-xs text-muted-foreground">
										Selected: {file.name}
									</p>
								)}
							</div>

							{/* Template Download */}
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">Need a template?</span>
								<Button
									variant="link"
									size="sm"
									className="h-auto p-0 text-primary"
									onClick={downloadTemplate}
								>
									Download CSV template
								</Button>
							</div>
						</div>

						<BulkImportResultPanel result={result} />

						{/* Quick Instructions */}
						<div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
							<p className="font-medium mb-1">Required columns:</p>
							<p>name, address, city, state, zipCode</p>
							<p className="font-medium mt-2 mb-1">Optional columns:</p>
							<p>propertyType, description</p>
						</div>
					</div>

					<DialogFooter className="gap-2">
						<Button
							variant="outline"
							onClick={() => {
								closeModal(modalId)
								setFile(null)
								setResult(null)
							}}
							disabled={bulkImportMutation.isPending}
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpload}
							disabled={!file || bulkImportMutation.isPending}
						>
							{bulkImportMutation.isPending
								? 'Importing...'
								: 'Import Properties'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}

const DEFAULT_ERROR_MESSAGE = 'Failed to import properties. Please try again.'

function getErrorMessage(error: unknown): string {
	if (!isApiError(error)) {
		return error instanceof Error && error.message
			? error.message
			: DEFAULT_ERROR_MESSAGE
	}

	const fallback = error.message || DEFAULT_ERROR_MESSAGE
	const backendCode = getBackendErrorCode(error.details)

	if (backendCode) {
		return getBusinessErrorMessage(backendCode, fallback)
	}

	return getApiErrorMessage(error.code, fallback)
}

function getBackendErrorCode(details: unknown): string | undefined {
	if (!details || typeof details !== 'object') {
		return undefined
	}

	const code = (details as { code?: unknown }).code
	return typeof code === 'string' ? code : undefined
}

function getBusinessErrorMessage(code: string, fallback: string): string {
	switch (code) {
		case BUSINESS_ERROR_CODES.NETWORK_ERROR:
		case BUSINESS_ERROR_CODES.CORS_ERROR:
			return 'Network error. Please check your connection and try again.'
		case BUSINESS_ERROR_CODES.INVALID_FILE_TYPE:
			return 'Invalid file type. Please upload a CSV file.'
		case BUSINESS_ERROR_CODES.NO_FILE_UPLOADED:
			return 'No file was uploaded. Please select a file.'
		case BUSINESS_ERROR_CODES.FILE_TOO_LARGE:
			return 'File is too large. Maximum size is 5MB.'
		case BUSINESS_ERROR_CODES.INVALID_CSV_FORMAT:
			return 'Invalid CSV format. Please check your file and try again.'
		case BUSINESS_ERROR_CODES.CSV_MISSING_REQUIRED_COLUMNS:
			return 'CSV is missing required columns. Please download the template and try again.'
		case BUSINESS_ERROR_CODES.CSV_INVALID_DATA:
			return 'CSV contains invalid data. Please review the rows and correct formatting.'
		case BUSINESS_ERROR_CODES.CSV_DUPLICATE_ENTRIES:
			return 'CSV contains duplicate entries. Please remove duplicates and try again.'
		default:
			return fallback
	}
}

function getApiErrorMessage(
	code: ApiErrorCode | undefined,
	fallback: string
): string {
	switch (code) {
		case ApiErrorCode.NETWORK_ERROR:
		case ApiErrorCode.NETWORK_TIMEOUT:
		case ApiErrorCode.NETWORK_OFFLINE:
			return 'Network error. Please check your connection and try again.'
		case ApiErrorCode.API_RATE_LIMITED:
			return 'Too many requests. Please wait a moment and try again.'
		default:
			return fallback
	}
}

function getFileValidationError(file: File): string | null {
	const hasValidType =
		CSV_ACCEPTED_MIME_TYPES.includes(file.type) || file.name.endsWith('.csv')
	if (!hasValidType) {
		return 'Please select a CSV file (.csv)'
	}

	if (file.size > CSV_MAX_FILE_SIZE_BYTES) {
		return 'File size must be less than 5MB'
	}

	return null
}

function buildCsvTemplate(
	headers: readonly string[],
	rows: ReadonlyArray<readonly string[]>
): string {
	const contentRows = rows.map(row => row.map(cell => `"${cell}"`).join(','))
	return [headers.join(','), ...contentRows].join('\n')
}

function triggerCsvDownload(content: string, filename: string) {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
	const link = document.createElement('a')
	const url = URL.createObjectURL(blob)

	link.setAttribute('href', url)
	link.setAttribute('download', filename)
	link.style.visibility = 'hidden'
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}

function BulkImportResultPanel({ result }: { result: BulkImportResult | null }) {
	if (!result) {
		return null
	}

	const isSuccessful = result.success
	const hasErrors = result.errors.length > 0

	return (
		<div
			className={`p-4 rounded-lg border ${
				isSuccessful
					? 'bg-success/5 border-success/20'
					: 'bg-destructive/5 border-destructive/20'
			}`}
		>
			<div className="flex items-start gap-3">
				{isSuccessful ? (
					<CheckCircle2 className="size-5 text-success mt-0.5" />
				) : (
					<AlertCircle className="size-5 text-destructive mt-0.5" />
				)}
				<div className="flex-1">
					<p className="font-medium text-sm">
						{isSuccessful ? 'Import Complete' : 'Import Failed'}
					</p>
					<p className="text-sm text-muted-foreground">
						{result.imported > 0 && `${result.imported} properties imported`}
						{result.failed > 0 && ` • ${result.failed} failed`}
					</p>
					{hasErrors && (
						<details className="mt-2">
							<summary className="text-xs cursor-pointer text-destructive">
								View errors ({result.errors.length})
							</summary>
							<div className="mt-2 max-h-32 overflow-y-auto space-y-1">
								{result.errors.map((err, idx) => (
									<p key={idx} className="text-xs text-destructive/80">
										Row {err.row}: {err.error}
									</p>
								))}
							</div>
						</details>
					)}
				</div>
			</div>
		</div>
	)
}
