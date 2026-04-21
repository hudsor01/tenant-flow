'use client'

import { Button } from '#components/ui/button'
import { FileUpload } from '#components/ui/file-upload/file-upload'
import { FileUploadDropzone } from '#components/ui/file-upload/file-upload-dropzone'
import { FileUploadTrigger } from '#components/ui/file-upload/file-upload-actions'
import { Download, FileSpreadsheet, CheckCircle2, Upload } from 'lucide-react'
import { createLogger } from '#lib/frontend-logger'
import {
	buildCsvTemplate,
	triggerCsvDownload,
	getFileValidationError,
	CSV_MAX_FILE_SIZE_BYTES
} from './parse-csv-with-schema'
import type { BulkImportConfig } from './types'

const logger = createLogger({ component: 'BulkImportUploadStep' })

interface BulkImportUploadStepProps<T> {
	config: BulkImportConfig<T>
	onFileSelect: (file: File) => void
}

export function BulkImportUploadStep<T>({
	config,
	onFileSelect
}: BulkImportUploadStepProps<T>) {
	const downloadTemplate = () => {
		const csvContent = buildCsvTemplate(
			config.templateHeaders,
			config.templateSampleRows
		)
		triggerCsvDownload(csvContent, config.templateFilename)
		logger.info('CSV template downloaded', {
			entity: config.entityLabel.plural
		})
	}

	const handleFileAccept = (file: File) => {
		logger.info('CSV file accepted', {
			name: file.name,
			size: file.size,
			type: file.type,
			entity: config.entityLabel.plural
		})
		onFileSelect(file)
	}

	const handleFileReject = (file: File, message: string) => {
		logger.warn('CSV file rejected', {
			name: file.name,
			size: file.size,
			type: file.type,
			reason: message,
			entity: config.entityLabel.plural
		})
	}

	return (
		<div className="space-y-5">
			<FileUpload
				accept=".csv,text/csv"
				maxFiles={1}
				maxSize={CSV_MAX_FILE_SIZE_BYTES}
				onFileAccept={handleFileAccept}
				onFileReject={handleFileReject}
				onFileValidate={getFileValidationError}
				label={`Upload CSV file for bulk ${config.entityLabel.singular.toLowerCase()} import`}
			>
				<FileUploadDropzone className="group relative rounded-xl border-2 border-dashed p-10 transition-all duration-300 cursor-pointer hover:border-primary/60 hover:bg-primary/5 hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[drag-over]:border-primary data-[drag-over]:bg-primary/10 data-[drag-over]:shadow-lg data-[drag-over]:shadow-primary/10 data-[drag-over]:scale-[1.01] data-[invalid]:border-destructive/60 data-[invalid]:bg-destructive/5">
					<div className="flex flex-col items-center justify-center gap-4 text-center">
						<div className="icon-container-lg bg-primary/10 text-primary border border-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15 group-data-[drag-over]:scale-110 group-data-[drag-over]:bg-primary/20 group-data-[drag-over]:animate-pulse">
							<Upload className="size-6 transition-transform duration-300 group-data-[drag-over]:animate-bounce" />
						</div>
						<div className="space-y-1.5">
							<p className="text-base font-semibold text-foreground">
								Click to upload or drag and drop
							</p>
							<p className="text-sm text-muted-foreground">
								CSV files only • Max 5MB
							</p>
						</div>
						<FileUploadTrigger asChild>
							<Button variant="outline" className="mt-2">
								<Upload className="mr-2 h-4 w-4" />
								Select CSV File
							</Button>
						</FileUploadTrigger>
					</div>
				</FileUploadDropzone>
			</FileUpload>

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
								{config.requiredFields}
							</p>
						</div>
					</div>
					{config.optionalFields && (
						<div className="flex items-start gap-2.5">
							<div className="icon-container-sm bg-muted text-muted-foreground shrink-0 mt-0.5">
								<CheckCircle2 className="size-3.5" />
							</div>
							<div>
								<p className="text-xs font-medium text-foreground">
									Optional Fields
								</p>
								<p className="text-xs text-muted-foreground">
									{config.optionalFields}
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
