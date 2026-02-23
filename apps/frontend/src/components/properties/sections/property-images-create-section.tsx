'use client'

import { CheckCircle, Upload, Loader2, X } from 'lucide-react'
import { cn } from '#lib/utils'
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone'

export type FileUploadStatus = 'pending' | 'uploading' | 'success' | 'error'

export interface FileWithStatus {
	file: File
	status: FileUploadStatus
	error?: string
	objectUrl: string
}

interface PropertyImagesCreateSectionProps {
	getRootProps: () => DropzoneRootProps
	getInputProps: () => DropzoneInputProps
	isDragActive: boolean
	uploadingImages: boolean
	filesWithStatus: FileWithStatus[]
	onRemoveFile: (index: number) => void
}

export function PropertyImagesCreateSection({
	getRootProps,
	getInputProps,
	isDragActive,
	uploadingImages,
	filesWithStatus,
	onRemoveFile
}: PropertyImagesCreateSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-6">
			<h3 className="typography-large">Property Images (Optional)</h3>
			<p className="text-sm text-muted-foreground">
				Add photos to showcase your property. Images will be uploaded after
				property creation. (Max 10 files, 10MB each)
			</p>

			<div
				{...getRootProps()}
				className={cn(
					'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
					isDragActive
						? 'border-primary bg-primary/5'
						: 'border-muted-foreground/25 hover:border-primary/50',
					uploadingImages && 'pointer-events-none opacity-60'
				)}
			>
				<input {...getInputProps()} disabled={uploadingImages} />
				{filesWithStatus.length === 0 ? (
					<div className="space-y-2">
						<Upload className="mx-auto h-12 w-12 text-muted-foreground" />
						<p className="text-sm font-medium">
							{isDragActive
								? 'Drop images here...'
								: 'Drag & drop images here, or click to browse'}
						</p>
						<p className="text-xs text-muted-foreground">
							JPG, PNG, WebP, or GIF (max 10MB each)
						</p>
					</div>
				) : (
					<div className="space-y-3">
						<p className="text-sm font-medium">
							{filesWithStatus.length} image(s) selected
						</p>
						<p className="text-xs text-muted-foreground">
							{uploadingImages
								? 'Uploading...'
								: 'Click or drag to add more (max 10 total)'}
						</p>
					</div>
				)}
			</div>

			{filesWithStatus.length > 0 && (
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
					{filesWithStatus.map(({ file, status, objectUrl }, index) => (
						<div
							key={objectUrl}
							className="relative aspect-square rounded-lg border overflow-hidden group"
						>
							<img
								src={objectUrl}
								alt={file.name}
								className="w-full h-full object-cover"
							/>

							{status === 'pending' && (
								<button
									type="button"
									onClick={e => {
										e.stopPropagation()
										onRemoveFile(index)
									}}
									className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
									aria-label="Remove image"
								>
									×
								</button>
							)}

							{status !== 'pending' && (
								<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
									{status === 'uploading' && (
										<div className="flex flex-col items-center gap-2 text-white">
											<Loader2 className="h-6 w-6 animate-spin" />
											<span className="text-xs font-medium">Uploading...</span>
										</div>
									)}
									{status === 'success' && (
										<div className="flex flex-col items-center gap-2 text-green-400">
											<CheckCircle className="h-6 w-6" />
											<span className="text-xs font-medium">Uploaded</span>
										</div>
									)}
									{status === 'error' && (
										<div className="flex flex-col items-center gap-2 text-red-400">
											<X className="h-6 w-6" />
											<span className="text-xs font-medium">Failed</span>
										</div>
									)}
								</div>
							)}

							<div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
								{file.name}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
