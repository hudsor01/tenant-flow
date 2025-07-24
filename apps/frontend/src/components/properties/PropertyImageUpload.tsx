import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useUploadPropertyImages } from '../../hooks/usePropertyDocuments'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Upload, Image, X, Star } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { motion, AnimatePresence } from 'framer-motion'

interface PropertyImageUploadProps {
	propertyId: string
	onUploadComplete?: () => void
	maxFiles?: number
	className?: string
}

interface FilePreview {
	file: File
	preview: string
	id: string
	isPrimary: boolean
}

export default function PropertyImageUpload({
	propertyId,
	onUploadComplete,
	maxFiles = 10,
	className
}: PropertyImageUploadProps) {
	const [files, setFiles] = useState<FilePreview[]>([])
	const [uploading, setUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)

	const uploadImages = useUploadPropertyImages()

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			// Validate file types
			const imageFiles = acceptedFiles.filter(file => {
				if (!file.type.startsWith('image/')) {
					toast.error(`${file.name} is not an image file`)
					return false
				}
				if (file.size > 10 * 1024 * 1024) {
					toast.error(`${file.name} is too large (max 10MB)`)
					return false
				}
				return true
			})

			// Create previews
			const newFiles: FilePreview[] = imageFiles.map((file, index) => ({
				file,
				preview: URL.createObjectURL(file),
				id: Math.random().toString(36).substring(7),
				isPrimary: files.length === 0 && index === 0 // First file in first batch is primary
			}))

			setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles))
		},
		[files.length, maxFiles]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
		},
		maxFiles: maxFiles - files.length,
		disabled: uploading || files.length >= maxFiles
	})

	const removeFile = (fileId: string) => {
		setFiles(prev => {
			const newFiles = prev.filter(f => f.id !== fileId)

			// If we removed the primary image, make the first remaining image primary
			if (newFiles.length > 0 && !newFiles.some(f => f.isPrimary)) {
				const firstFile = newFiles[0]
				if (firstFile) {
					newFiles[0] = { ...firstFile, isPrimary: true }
				}
			}

			return newFiles
		})
	}

	const setPrimaryImage = (fileId: string) => {
		setFiles(prev =>
			prev.map(f => ({
				...f,
				isPrimary: f.id === fileId
			}))
		)
	}

	const handleUpload = async () => {
		if (files.length === 0) {
			toast.error('Please select some images to upload')
			return
		}

		setUploading(true)
		setUploadProgress(0)

		try {
			const primaryIndex = files.findIndex(f => f.isPrimary)

			// Simulate progress
			const progressInterval = setInterval(() => {
				setUploadProgress(prev => Math.min(prev + 10, 90))
			}, 200)

			await uploadImages.mutateAsync({
				files: files.map(f => f.file),
				propertyId,
				setPrimaryIndex: primaryIndex >= 0 ? primaryIndex : 0
			})

			clearInterval(progressInterval)
			setUploadProgress(100)

			toast.success(`Successfully uploaded ${files.length} image(s)`)

			// Clean up
			files.forEach(f => URL.revokeObjectURL(f.preview))
			setFiles([])
			onUploadComplete?.()
		} catch (error) {
			logger.error('Upload failed', error as Error, {
				propertyId,
				fileCount: files.length,
				primaryIndex: files.findIndex(f => f.isPrimary)
			})
			toast.error('Failed to upload images')
		} finally {
			setUploading(false)
			setUploadProgress(0)
		}
	}

	const clearAll = () => {
		files.forEach(f => URL.revokeObjectURL(f.preview))
		setFiles([])
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center">
					<Image className="mr-2 h-5 w-5" />
					Upload Property Images
				</CardTitle>
				<CardDescription>
					Upload high-quality images of your property. The first image
					will be set as the primary image.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Dropzone */}
				<div
					{...getRootProps()}
					className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
						isDragActive
							? 'border-blue-400 bg-blue-50'
							: 'border-gray-300 hover:border-gray-400'
					} ${uploading || files.length >= maxFiles ? 'cursor-not-allowed opacity-50' : ''}`}
				>
					<input {...getInputProps()} />
					<Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
					{isDragActive ? (
						<p className="text-blue-600">Drop the images here...</p>
					) : (
						<div>
							<p className="mb-2 text-gray-600">
								Drag & drop images here, or click to select
							</p>
							<p className="text-sm text-gray-500">
								Supports JPG, PNG, GIF, WebP (max 10MB each,{' '}
								{maxFiles} files max)
							</p>
						</div>
					)}
				</div>

				{/* File previews */}
				<AnimatePresence>
					{files.length > 0 && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							className="space-y-4"
						>
							<div className="flex items-center justify-between">
								<h4 className="font-medium">
									Selected Images ({files.length})
								</h4>
								<Button
									variant="outline"
									size="sm"
									onClick={clearAll}
									disabled={uploading}
								>
									Clear All
								</Button>
							</div>

							<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
								{files.map((filePreview, index) => (
									<motion.div
										key={filePreview.id}
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										className="group relative"
									>
										<div className="relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200">
											<img
												src={filePreview.preview}
												alt={`Preview ${index + 1}`}
												className="h-full w-full object-cover"
											/>

											{/* Primary badge */}
											{filePreview.isPrimary && (
												<Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
													<Star className="mr-1 h-3 w-3" />
													Primary
												</Badge>
											)}

											{/* Remove button */}
											<Button
												size="sm"
												variant="destructive"
												className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
												onClick={() =>
													removeFile(filePreview.id)
												}
												disabled={uploading}
											>
												<X className="h-3 w-3" />
											</Button>

											{/* Set primary button */}
											{!filePreview.isPrimary && (
												<Button
													size="sm"
													variant="secondary"
													className="absolute bottom-2 left-2 h-6 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
													onClick={() =>
														setPrimaryImage(
															filePreview.id
														)
													}
													disabled={uploading}
												>
													<Star className="mr-1 h-3 w-3" />
													Primary
												</Button>
											)}
										</div>

										<p className="mt-1 truncate text-xs text-gray-600">
											{filePreview.file.name}
										</p>
									</motion.div>
								))}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Upload progress */}
				{uploading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="space-y-2"
					>
						<div className="flex justify-between text-sm">
							<span>Uploading images...</span>
							<span>{uploadProgress}%</span>
						</div>
						<Progress value={uploadProgress} className="w-full" />
					</motion.div>
				)}

				{/* Actions */}
				{files.length > 0 && (
					<div className="flex space-x-2">
						<Button
							onClick={handleUpload}
							disabled={uploading || files.length === 0}
							className="flex-1"
						>
							{uploading ? (
								<>
									<div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
									Uploading...
								</>
							) : (
								<>
									<Upload className="mr-2 h-4 w-4" />
									Upload {files.length} Image
									{files.length > 1 ? 's' : ''}
								</>
							)}
						</Button>

						{!uploading && (
							<Button variant="outline" onClick={clearAll}>
								Cancel
							</Button>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
