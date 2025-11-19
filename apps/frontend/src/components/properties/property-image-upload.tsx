'use client'

import { useState, useCallback, useMemo } from 'react'
import imageCompression from 'browser-image-compression'
import { useDropzone } from 'react-dropzone'
import { Button } from '#components/ui/button'
import { Badge } from '#components/ui/badge'
import { X, Upload, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useUploadPropertyImage, usePropertyImages } from '#hooks/api/use-properties'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'PropertyImageUpload' })

interface FileWithPreview {
	original: File
	compressed: File
	originalSize: number
	compressedSize: number
	preview: string
}

interface PropertyImageUploadProps {
	propertyId: string
	maxImages?: number
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const COMPRESSION_OPTIONS = {
	maxSizeMB: 10, // Accept up to 10MB before compression
	maxWidthOrHeight: 1280, // Resize to max 1280px
	useWebWorker: true, // Don't block UI thread
	fileType: 'image/webp' as const, // Convert to WebP
	initialQuality: 0.75 // 75% quality (aggressive)
}

export function PropertyImageUpload({ propertyId, maxImages = 5 }: PropertyImageUploadProps) {
	const [filesWithPreviews, setFilesWithPreviews] = useState<FileWithPreview[]>([])
	const [isCompressing, setIsCompressing] = useState(false)
	const [compressionProgress, setCompressionProgress] = useState<Record<string, number>>({})

	const uploadMutation = useUploadPropertyImage()
	const { data: existingImages } = usePropertyImages(propertyId)

	const remainingSlots = useMemo(() => {
		return Math.max(0, maxImages - (existingImages?.length || 0))
	}, [maxImages, existingImages?.length])

	const handleFilesSelected = useCallback(
		async (selectedFiles: File[]) => {
			if (remainingSlots === 0) {
				toast.error(`Maximum ${maxImages} images reached`)
				return
			}

			const filesToProcess = selectedFiles.slice(0, remainingSlots)

			setIsCompressing(true)
			const compressed: FileWithPreview[] = []

			for (const file of filesToProcess) {
				try {
					logger.debug('[IMAGE:COMPRESS:START]', { filename: file.name, size: file.size })

					const compressedFile = await imageCompression(file, {
						...COMPRESSION_OPTIONS,
						onProgress: (progress) => {
							setCompressionProgress((prev) => ({
								...prev,
								[file.name]: progress
							}))
						}
					})

					const preview = URL.createObjectURL(compressedFile)
					const compressionRatio = Math.round((1 - compressedFile.size / file.size) * 100)

					logger.debug('[IMAGE:COMPRESS:SUCCESS]', {
						filename: file.name,
						original: file.size,
						compressed: compressedFile.size,
						compressionRatio
					})

					compressed.push({
						original: file,
						compressed: compressedFile,
						originalSize: file.size,
						compressedSize: compressedFile.size,
						preview
					})
				} catch (error) {
					logger.error('[IMAGE:COMPRESS:ERROR]', {
						filename: file.name,
						error: error instanceof Error ? error.message : String(error)
					})
					toast.error(`Failed to compress ${file.name}`)
				}
			}

			setFilesWithPreviews((prev) => [...prev, ...compressed])
			setIsCompressing(false)
			setCompressionProgress({})

			if (compressed.length > 0) {
				toast.success(`${compressed.length} image${compressed.length > 1 ? 's' : ''} ready to upload`)
			}
		},
		[remainingSlots, maxImages]
	)

	const removeFile = useCallback((index: number) => {
		setFilesWithPreviews((prev) => {
			const newFiles = prev.filter((_, i) => i !== index)
			// Clean up preview URL
			const removedFile = prev[index]
			if (removedFile) {
				URL.revokeObjectURL(removedFile.preview)
			}
			return newFiles
		})
	}, [])

	const handleUpload = useCallback(async () => {
		if (filesWithPreviews.length === 0) return

		logger.info('[IMAGE:UPLOAD:START]', { count: filesWithPreviews.length })

		const totalFiles = filesWithPreviews.length
		const toastId = toast.loading(`Uploading ${totalFiles} image${totalFiles > 1 ? 's' : ''}...`)

		try {
			let successCount = 0
			const failedFiles: string[] = []

			for (const fileData of filesWithPreviews) {
				try {
					logger.debug('[IMAGE:UPLOAD:FILE]', {
						filename: fileData.original.name,
						size: fileData.compressedSize
					})

					await uploadMutation.mutateAsync({
						property_id: propertyId,
						file: fileData.compressed
					})

					successCount++
					logger.debug('[IMAGE:UPLOAD:FILE:SUCCESS]', { filename: fileData.original.name })
				} catch (error) {
					failedFiles.push(fileData.original.name)
					logger.error('[IMAGE:UPLOAD:FILE:ERROR]', {
						filename: fileData.original.name,
						error: error instanceof Error ? error.message : String(error)
					})
				}
			}

			// Clean up preview URLs
			filesWithPreviews.forEach((f) => URL.revokeObjectURL(f.preview))
			setFilesWithPreviews([])

			if (successCount === totalFiles) {
				toast.success(`${successCount} image${successCount > 1 ? 's' : ''} uploaded`, {
					id: toastId
				})
				logger.info('[IMAGE:UPLOAD:SUCCESS]', { count: successCount })
			} else if (successCount > 0) {
				toast.warning(
					`${successCount} uploaded, ${failedFiles.length} failed: ${failedFiles.join(', ')}`,
					{
						id: toastId
					}
				)
				logger.warn('[IMAGE:UPLOAD:PARTIAL]', { successCount, failedCount: failedFiles.length })
			} else {
				toast.error('Failed to upload images', { id: toastId })
			}
		} catch (error) {
			toast.error('Upload failed', { id: toastId })
			logger.error('[IMAGE:UPLOAD:ERROR]', {
				error: error instanceof Error ? error.message : String(error)
			})
		}
	}, [filesWithPreviews, propertyId, uploadMutation])

	const totalSavings = useMemo(() => {
		const originalTotal = filesWithPreviews.reduce((sum, f) => sum + f.originalSize, 0)
		const compressedTotal = filesWithPreviews.reduce((sum, f) => sum + f.compressedSize, 0)
		return Math.round((1 - compressedTotal / originalTotal) * 100) || 0
	}, [filesWithPreviews])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop: handleFilesSelected,
		accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
		disabled: isCompressing || uploadMutation.isPending || remainingSlots === 0,
		maxSize: 10 * 1024 * 1024 // 10MB before compression
	})

	return (
		<div className="space-y-4">
			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
					isDragActive
						? 'border-primary bg-primary/10'
						: 'border-muted-foreground/30 bg-muted/50 hover:bg-muted'
				} ${isCompressing || uploadMutation.isPending || remainingSlots === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
			>
				<input {...getInputProps()} />
				<Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
				{isDragActive ? (
					<p className="text-sm font-medium">Drop images here</p>
				) : (
					<div className="space-y-1">
						<p className="text-sm font-medium">Drag images here or click to select</p>
						<p className="text-xs text-muted-foreground">
							Max 10MB per image (will compress automatically)
						</p>
					</div>
				)}
			</div>

			{/* Remaining slots info */}
			{remainingSlots <= maxImages && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Badge variant="secondary">{remainingSlots} slots available</Badge>
					{remainingSlots === 0 && (
						<span className="flex items-center gap-1 text-amber-600">
							<AlertCircle className="h-4 w-4" />
							Maximum images reached
						</span>
					)}
				</div>
			)}

			{/* File previews with compression stats */}
			{filesWithPreviews.length > 0 && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h4 className="font-medium">Images to upload ({filesWithPreviews.length})</h4>
						{totalSavings > 0 && (
							<span className="text-sm text-green-600 font-medium">
								{totalSavings}% total reduction
							</span>
						)}
					</div>

					{filesWithPreviews.map((fileData, idx) => {
						const reductionPercent = Math.round(
							(1 - fileData.compressedSize / fileData.originalSize) * 100
						)

						return (
							<div
								key={`${fileData.original.name}-${idx}`}
								className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
							>
								{/* Thumbnail */}
								<img
									src={fileData.preview}
									alt={fileData.original.name}
									className="h-16 w-16 object-cover rounded flex-shrink-0"
								/>

								{/* File info */}
								<div className="flex-1 min-w-0">
									<p className="font-medium text-sm truncate">{fileData.original.name}</p>
									<p className="text-xs text-muted-foreground mt-1">
										{formatBytes(fileData.originalSize)} →{' '}
										<span className="text-green-600 font-medium">
											{formatBytes(fileData.compressedSize)}
										</span>
										<span className="text-green-600 ml-2 font-medium">
											({reductionPercent}% smaller)
										</span>
									</p>

									{/* Compression progress */}
									{isCompressing && compressionProgress[fileData.original.name] !== undefined && (
										<div className="mt-1 h-1.5 w-full bg-muted-foreground/20 rounded-full overflow-hidden">
											<div
												className="h-full bg-primary transition-all"
												style={{
													width: `${(compressionProgress[fileData.original.name] || 0) * 100}%`
												}}
											/>
										</div>
									)}
								</div>

								{/* Remove button */}
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 flex-shrink-0"
									onClick={() => removeFile(idx)}
									disabled={isCompressing || uploadMutation.isPending}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)
					})}
				</div>
			)}

			{/* Upload button */}
			{filesWithPreviews.length > 0 && (
				<Button
					onClick={handleUpload}
					disabled={isCompressing || uploadMutation.isPending}
					className="w-full"
					size="lg"
				>
					<Upload className="h-4 w-4 mr-2" />
					{uploadMutation.isPending
						? 'Uploading...'
						: `Upload ${filesWithPreviews.length} Image${filesWithPreviews.length > 1 ? 's' : ''}`}
				</Button>
			)}
		</div>
	)
}
