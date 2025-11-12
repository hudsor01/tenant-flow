/**
 * Image Upload Component for Maintenance Requests
 * Features: Duplicate detection, compression, drag-and-drop, Supabase Storage
 */

'use client'

import { Button } from '#components/ui/button'
import { getSupabaseClientInstance } from '@repo/shared/lib/supabase-client'
import { logger } from '@repo/shared/lib/frontend-logger'
import { CheckSquare, Square, Trash2, Upload, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

const supabase = getSupabaseClientInstance()
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const COMPRESSION_QUALITY = 0.8 // 80% quality
const MAX_DIMENSION = 1920 // Max width/height

interface ImageUploadProps {
	onUploadComplete: (urls: string[]) => void
	maxImages?: number
	existingImages?: string[]
}

export function ImageUpload({
	onUploadComplete,
	maxImages = 5,
	existingImages = []
}: ImageUploadProps) {
	const [uploading, setUploading] = useState(false)
	const [images, setImages] = useState<string[]>(existingImages)
	const [previews, setPreviews] = useState<string[]>([])
	const [isDragging, setIsDragging] = useState(false)
	const [fileHashes, setFileHashes] = useState<Set<string>>(new Set())
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
	const fileInputRef = useRef<HTMLInputElement>(null)

	/**
	 * Generate hash for duplicate detection
	 */
	const generateFileHash = useCallback(async (file: File): Promise<string> => {
		const buffer = await file.arrayBuffer()
		const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
		const hashArray = Array.from(new Uint8Array(hashBuffer))
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
	}, [])

	/**
	 * Compress image using Canvas API
	 */
	const compressImage = useCallback(async (file: File): Promise<File> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onload = e => {
				const img = new Image()
				img.onload = () => {
					// Calculate new dimensions
					let { width, height } = img
					if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
						if (width > height) {
							height = (height / width) * MAX_DIMENSION
							width = MAX_DIMENSION
						} else {
							width = (width / height) * MAX_DIMENSION
							height = MAX_DIMENSION
						}
					}

					// Create canvas and compress
					const canvas = document.createElement('canvas')
					canvas.width = width
					canvas.height = height
					const ctx = canvas.getContext('2d')
					if (!ctx) {
						reject(new Error('Failed to get canvas context'))
						return
					}

					ctx.drawImage(img, 0, 0, width, height)

					canvas.toBlob(
						blob => {
							if (!blob) {
								reject(new Error('Failed to compress image'))
								return
							}
							const compressedFile = new File([blob], file.name, {
								type: file.type,
								lastModified: Date.now()
							})
							resolve(compressedFile)
						},
						file.type,
						COMPRESSION_QUALITY
					)
				}
				img.onerror = () => reject(new Error('Failed to load image'))
				img.src = e.target?.result as string
			}
			reader.onerror = () => reject(new Error('Failed to read file'))
			reader.readAsDataURL(file)
		})
	}, [])

	/**
	 * Upload to Supabase Storage
	 */
	const uploadToSupabase = useCallback(
		async (file: File): Promise<string | null> => {
			try {
				// Generate unique filename
				const fileExt = file.name.split('.').pop()
				const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
				const filePath = `maintenance_requests/${fileName}`

				// Upload to Supabase Storage
				const { data, error } = await supabase.storage
					.from('maintenance-photos')
					.upload(filePath, file, {
						cacheControl: '3600',
						upsert: false
					})

				if (error) throw error

				// Get public URL
				const {
					data: { publicUrl }
				} = supabase.storage.from('maintenance-photos').getPublicUrl(data.path)

				return publicUrl
			} catch (error) {
				logger.error('Upload error', {
					action: 'single_image_upload_failed',
					metadata: {
						error: error instanceof Error ? error.message : String(error)
					}
				})
				toast.error('Failed to upload image')
				return null
			}
		},
		[]
	)

	/**
	 * Process and upload files
	 */
	const handleFileSelect = useCallback(
		async (
			e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLLabelElement>
		) => {
			let files: File[] = []

			if ('dataTransfer' in e) {
				e.preventDefault()
				files = Array.from(e.dataTransfer.files)
				setIsDragging(false)
			} else {
				files = Array.from(e.target.files || [])
			}

			// Validate number of files
			if (images.length + files.length > maxImages) {
				toast.error(`Maximum ${maxImages} images allowed`)
				return
			}

			// Validate file types and sizes
			for (const file of files) {
				if (!ALLOWED_TYPES.includes(file.type)) {
					toast.error(
						`${file.name}: Only JPG, PNG, and WebP images are allowed`
					)
					return
				}
				if (file.size > MAX_FILE_SIZE) {
					toast.error(`${file.name}: File size must be less than 5MB`)
					return
				}
			}

			setUploading(true)

			try {
				// Process files: check duplicates, compress, upload
				const processedFiles: { file: File; hash: string }[] = []

				for (const file of files) {
					// Generate hash for duplicate detection
					const hash = await generateFileHash(file)

					// Check for duplicates
					if (fileHashes.has(hash)) {
						toast.error(`${file.name}: Duplicate image detected`)
						continue
					}

					// Compress image
					const compressedFile = await compressImage(file)

					processedFiles.push({ file: compressedFile, hash })
				}

				if (processedFiles.length === 0) {
					setUploading(false)
					return
				}

				// Create preview URLs
				const newPreviews = processedFiles.map(({ file }) =>
					URL.createObjectURL(file)
				)
				setPreviews(prev => [...prev, ...newPreviews])

				// Upload files
				const uploadPromises = processedFiles.map(({ file }) =>
					uploadToSupabase(file)
				)
				const uploadedUrls = await Promise.all(uploadPromises)

				// Filter out failed uploads
				const successfulUrls = uploadedUrls.filter(
					(url): url is string => url !== null
				)

				if (successfulUrls.length > 0) {
					const newImages = [...images, ...successfulUrls]
					const newHashes = new Set(fileHashes)
					processedFiles.forEach(({ hash }) => newHashes.add(hash))

					setImages(newImages)
					setFileHashes(newHashes)
					onUploadComplete(newImages)
					toast.success(
						`${successfulUrls.length} image(s) uploaded successfully`
					)
				}

				// Clean up preview URLs
				setPreviews(prev =>
					prev.filter((_, i) => !uploadedUrls[i] || uploadedUrls[i] === null)
				)
			} catch (error) {
				logger.error('Bulk upload error', {
					action: 'bulk_image_upload_failed',
					metadata: {
						error: error instanceof Error ? error.message : String(error)
					}
				})
				toast.error('Failed to upload images')
			} finally {
				setUploading(false)
				if (fileInputRef.current) {
					fileInputRef.current.value = ''
				}
			}
		},
		[
			images,
			maxImages,
			onUploadComplete,
			uploadToSupabase,
			fileHashes,
			generateFileHash,
			compressImage
		]
	)

	/**
	 * Handle drag and drop events
	 */
	const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback(
		(e: React.DragEvent<HTMLLabelElement>) => {
			e.preventDefault()
			setIsDragging(false)
		},
		[]
	)

	/**
	 * Remove image from list
	 */
	const handleRemoveImage = useCallback(
		(index: number) => {
			const newImages = images.filter((_, i) => i !== index)
			setImages(newImages)
			setSelectedIndices(new Set()) // Clear selection after delete
			onUploadComplete(newImages)
		},
		[images, onUploadComplete]
	)

	/**
	 * Toggle image selection for bulk delete
	 */
	const toggleImageSelection = useCallback((index: number) => {
		setSelectedIndices(prev => {
			const newSet = new Set(prev)
			if (newSet.has(index)) {
				newSet.delete(index)
			} else {
				newSet.add(index)
			}
			return newSet
		})
	}, [])

	/**
	 * Select all images
	 */
	const handleSelectAll = useCallback(() => {
		if (selectedIndices.size === images.length) {
			setSelectedIndices(new Set()) // Deselect all if all are selected
		} else {
			setSelectedIndices(new Set(images.map((_, i) => i)))
		}
	}, [images, selectedIndices.size])

	/**
	 * Delete selected images in bulk
	 */
	const handleBulkDelete = useCallback(() => {
		if (selectedIndices.size === 0) {
			toast.error('No images selected')
			return
		}

		const newImages = images.filter((_, i) => !selectedIndices.has(i))
		setImages(newImages)
		setSelectedIndices(new Set())
		onUploadComplete(newImages)
		toast.success(`${selectedIndices.size} image(s) removed`)
	}, [images, selectedIndices, onUploadComplete])

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<label htmlFor="image-upload">
					<span className="text-sm font-medium">
						Photos (Optional) - {images.length}/{maxImages}
					</span>
				</label>
				{images.length > 0 && (
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleSelectAll}
							className="gap-2"
						>
							{selectedIndices.size === images.length ? (
								<>
									<CheckSquare className="size-4" />
									Deselect All
								</>
							) : (
								<>
									<Square className="size-4" />
									Select All
								</>
							)}
						</Button>
						{selectedIndices.size > 0 && (
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleBulkDelete}
								className="gap-2"
							>
								<Trash2 className="size-4" />
								Delete ({selectedIndices.size})
							</Button>
						)}
					</div>
				)}
			</div>

			{/* Image Preview Grid */}
			{(images.length > 0 || previews.length > 0) && (
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{images.map((url, index) => {
						const isSelected = selectedIndices.has(index)
						return (
							<div
								key={url}
								className={`relative group aspect-square cursor-pointer ${
									isSelected ? 'ring-2 ring-accent-main' : ''
								}`}
								onClick={() => toggleImageSelection(index)}
							>
								<img
									src={url}
									alt={`Upload ${index + 1}`}
									className={`w-full h-full object-cover rounded-lg transition-opacity ${
										isSelected ? 'opacity-75' : ''
									}`}
								/>
								{/* Checkbox for selection */}
								<div className="absolute top-2 left-2 z-10">
									<div
										className={`size-6 rounded flex items-center justify-center ${
											isSelected
												? 'bg-accent-main text-white'
												: 'bg-white/80 border border-gray-300'
										}`}
									>
										{isSelected && <CheckSquare className="size-4" />}
									</div>
								</div>
								{/* Individual delete button (hidden when selecting) */}
								{selectedIndices.size === 0 && (
									<button
										type="button"
										onClick={e => {
											e.stopPropagation()
											handleRemoveImage(index)
										}}
										className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<X className="size-4" />
									</button>
								)}
							</div>
						)
					})}
					{previews.map((url, index) => (
						<div key={url} className="relative aspect-square">
							<img
								src={url}
								alt={`Preview ${index + 1}`}
								className="w-full h-full object-cover rounded-lg opacity-50"
							/>
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="animate-spin rounded-full size-8 border-b-2 border-accent-main" />
							</div>
						</div>
					))}
				</div>
			)}

			{/* Upload Button with Drag-and-Drop */}
			{images.length < maxImages && (
				<label
					htmlFor="image-upload"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleFileSelect}
					className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
						isDragging
							? 'border-accent-main bg-accent-main/10'
							: 'border-border hover:border-accent-main'
					} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
				>
					<input
						ref={fileInputRef}
						id="image-upload"
						type="file"
						accept="image/jpeg,image/jpg,image/png,image/webp"
						multiple
						onChange={handleFileSelect}
						disabled={uploading}
						className="sr-only"
					/>
					<Upload className="size-10 text-muted-foreground mb-2" />
					<p className="text-sm font-medium text-muted-foreground">
						{uploading
							? 'Uploading...'
							: isDragging
								? 'Drop images here'
								: 'Click or drag images here'}
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						JPG, PNG or WebP (max 5MB each)
					</p>
					<p className="text-xs text-muted-foreground">
						Images will be compressed automatically
					</p>
				</label>
			)}
		</div>
	)
}
