'use client'

import { Button } from '#components/ui/button'
import { Upload, Download, FileSpreadsheet, CheckCircle2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '#lib/utils'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import {
	buildCsvTemplate,
	triggerCsvDownload,
	getFileValidationError,
	CSV_TEMPLATE_HEADERS,
	CSV_TEMPLATE_SAMPLE_ROWS,
	CSV_TEMPLATE_FILENAME
} from './csv-utils'

const logger = createLogger({ component: 'BulkImportUploadStep' })

interface BulkImportUploadStepProps {
	onFileSelect: (file: File) => void
}

export function BulkImportUploadStep({
	onFileSelect
}: BulkImportUploadStepProps) {
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleFileChange = useCallback(
		(selectedFile: File) => {
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

			onFileSelect(selectedFile)
		},
		[onFileSelect]
	)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			handleFileChange(selectedFile)
		}
	}

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			const droppedFile = e.dataTransfer.files?.[0]
			if (droppedFile) {
				handleFileChange(droppedFile)
			}
		},
		[handleFileChange]
	)

	const downloadTemplate = () => {
		const csvContent = buildCsvTemplate(
			CSV_TEMPLATE_HEADERS,
			CSV_TEMPLATE_SAMPLE_ROWS
		)
		triggerCsvDownload(csvContent, CSV_TEMPLATE_FILENAME)
		logger.info('CSV template downloaded')
	}

	return (
		<div className="space-y-5">
			{/* Enhanced Drag and Drop Zone */}
			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() => fileInputRef.current?.click()}
				className={cn(
					'group relative rounded-xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer',
					'hover:border-primary/60 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					isDragging
						? 'border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.01]'
						: 'border-border/60 bg-linear-to-b from-muted/30 to-muted/10'
				)}
				role="button"
				tabIndex={0}
				onKeyDown={e => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault()
						fileInputRef.current?.click()
					}
				}}
				aria-label="Upload CSV file"
			>
				<input
					ref={fileInputRef}
					id="file-upload"
					type="file"
					accept=".csv,text/csv"
					onChange={handleInputChange}
					className="hidden"
				/>

				<div className="flex flex-col items-center justify-center gap-4 text-center">
					{/* Animated Icon Container */}
					<div
						className={cn(
							'icon-container-lg bg-primary/10 text-primary border border-primary/20',
							'transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15',
							isDragging && 'scale-110 bg-primary/20 animate-pulse'
						)}
					>
						<Upload
							className={cn(
								'size-6 transition-transform duration-300',
								isDragging && 'animate-bounce'
							)}
						/>
					</div>

					<div className="space-y-1.5">
						<p className="text-base font-semibold text-foreground">
							{isDragging
								? 'Drop your file here'
								: 'Click to upload or drag and drop'}
						</p>
						<p className="text-sm text-muted-foreground">
							CSV files only • Max 5MB
						</p>
					</div>

					{/* Visual hint for drag state */}
					{isDragging && (
						<div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none animate-pulse" />
					)}
				</div>
			</div>

			{/* Template Download Card */}
			<div className="card-standard p-4 bg-linear-to-r from-muted/40 to-muted/20 hover:border-primary/30 transition-colors">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="icon-container-sm bg-info/10 text-info">
							<FileSpreadsheet className="size-4" />
						</div>
						<div>
							<p className="typography-small">Need a template?</p>
							<p className="text-xs text-muted-foreground">
								Download our CSV template to get started
							</p>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						className="gap-2 hover:bg-primary/5 hover:border-primary/40 transition-all"
						onClick={e => {
							e.stopPropagation()
							downloadTemplate()
						}}
					>
						<Download className="size-3.5" />
						Download
					</Button>
				</div>
			</div>

			{/* Requirements Card */}
			<div className="card-standard p-4 space-y-3">
				<p className="font-semibold text-sm flex items-center gap-2">
					<span className="size-1.5 rounded-full bg-primary" />
					CSV Requirements
				</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="flex items-start gap-2.5">
						<div className="icon-container-sm bg-success/10 text-success shrink-0 mt-0.5">
							<CheckCircle2 className="size-3.5" />
						</div>
						<div>
							<p className="text-xs font-medium text-foreground">
								Required Fields
							</p>
							<p className="text-xs text-muted-foreground">
								name, address, city, state, postal_code
							</p>
						</div>
					</div>
					<div className="flex items-start gap-2.5">
						<div className="icon-container-sm bg-muted text-muted-foreground shrink-0 mt-0.5">
							<CheckCircle2 className="size-3.5" />
						</div>
						<div>
							<p className="text-xs font-medium text-foreground">
								Optional Fields
							</p>
							<p className="text-xs text-muted-foreground">
								property_type, description
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
