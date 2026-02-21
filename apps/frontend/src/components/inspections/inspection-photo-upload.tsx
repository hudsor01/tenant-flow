'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, CheckCircle } from 'lucide-react'
import { Button } from '#components/ui/button'
import { createClient } from '#lib/supabase/client'
import { useRecordInspectionPhoto } from '#hooks/api/use-inspections'
import { toast } from 'sonner'

interface InspectionPhotoUploadProps {
	inspectionId: string
	roomId: string
	onUploadComplete?: () => void
}

interface FileUploadState {
	file: File
	objectUrl: string
	status: 'pending' | 'uploading' | 'success' | 'error'
	error?: string
}

export function InspectionPhotoUpload({
	inspectionId,
	roomId,
	onUploadComplete
}: InspectionPhotoUploadProps) {
	const [files, setFiles] = useState<FileUploadState[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const recordPhoto = useRecordInspectionPhoto(inspectionId)

	const onDrop = useCallback((acceptedFiles: File[]) => {
		const newFiles = acceptedFiles.map(file => ({
			file,
			objectUrl: URL.createObjectURL(file),
			status: 'pending' as const
		}))
		setFiles(prev => [...prev, ...newFiles])
	}, [])

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'image/jpeg': [],
			'image/jpg': [],
			'image/png': [],
			'image/webp': []
		},
		maxSize: 10 * 1024 * 1024, // 10MB
		multiple: true
	})

	function removeFile(index: number) {
		setFiles(prev => {
			const file = prev[index]
			if (file) URL.revokeObjectURL(file.objectUrl)
			return prev.filter((_, i) => i !== index)
		})
	}

	async function handleUpload() {
		if (files.length === 0) return

		const supabase = createClient()
		setIsUploading(true)

		const pendingFiles = files.filter(f => f.status === 'pending')

		const results = await Promise.allSettled(
			pendingFiles.map(async (fileState, idx) => {
				const { file } = fileState
				const fileExt = file.name.split('.').pop() ?? 'jpg'
				const fileName = `${crypto.randomUUID()}.${fileExt}`
				const storagePath = `${inspectionId}/${roomId}/${fileName}`

				// Mark as uploading
				setFiles(prev =>
					prev.map((f, i) =>
						i === idx ? { ...f, status: 'uploading' as const } : f
					)
				)

				const { error: uploadError } = await supabase.storage
					.from('inspection-photos')
					.upload(storagePath, file, { cacheControl: '3600', upsert: false })

				if (uploadError) throw uploadError

				// Record the photo in the database
				await recordPhoto.mutateAsync({
					inspection_room_id: roomId,
					inspection_id: inspectionId,
					storage_path: storagePath,
					file_name: file.name,
					file_size: file.size,
					mime_type: file.type
				})

				// Mark as success
				setFiles(prev =>
					prev.map((f, i) =>
						i === idx ? { ...f, status: 'success' as const } : f
					)
				)
			})
		)

		const successCount = results.filter(r => r.status === 'fulfilled').length
		const errorCount = results.filter(r => r.status === 'rejected').length

		if (successCount > 0 && errorCount === 0) {
			toast.success(`${successCount} photo${successCount > 1 ? 's' : ''} uploaded`)
			// Clean up object URLs and clear successful uploads after a delay
			setTimeout(() => {
				setFiles(prev => {
					const successFiles = prev.filter(f => f.status === 'success')
					for (const f of successFiles) URL.revokeObjectURL(f.objectUrl)
					const remaining = prev.filter(f => f.status !== 'success')
					return remaining
				})
				onUploadComplete?.()
			}, 1500)
		} else if (errorCount > 0) {
			toast.error(
				`${errorCount} photo${errorCount > 1 ? 's' : ''} failed to upload`
			)
		}

		setIsUploading(false)
	}

	const pendingCount = files.filter(f => f.status === 'pending').length

	return (
		<div className="space-y-3">
			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
					isDragActive
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-primary/50 hover:bg-muted/30'
				}`}
			>
				<input {...getInputProps()} />
				<Upload
					className="w-8 h-8 text-muted-foreground mx-auto mb-2"
					aria-hidden="true"
				/>
				<p className="text-sm text-muted-foreground">
					{isDragActive
						? 'Drop photos here'
						: 'Drag photos here or click to select'}
				</p>
				<p className="text-xs text-muted-foreground mt-1">
					JPEG, PNG, WebP up to 10MB each
				</p>
			</div>

			{/* File previews */}
			{files.length > 0 && (
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{files.map((fileState, index) => (
						<div
							key={fileState.objectUrl}
							className="aspect-square rounded-md bg-muted overflow-hidden relative group"
						>
							<img
								src={fileState.objectUrl}
								alt={fileState.file.name}
								className="w-full h-full object-cover"
							/>
							{/* Status overlay */}
							{fileState.status === 'uploading' && (
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								</div>
							)}
							{fileState.status === 'success' && (
								<div className="absolute inset-0 bg-black/20 flex items-center justify-center">
									<CheckCircle
										className="w-6 h-6 text-white"
										aria-hidden="true"
									/>
								</div>
							)}
							{/* Remove button */}
							{fileState.status === 'pending' && (
								<button
									type="button"
									onClick={() => removeFile(index)}
									aria-label={`Remove ${fileState.file.name}`}
									className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<X className="w-3 h-3" aria-hidden="true" />
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Upload button */}
			{pendingCount > 0 && (
				<Button
					type="button"
					size="sm"
					onClick={handleUpload}
					disabled={isUploading}
					className="min-h-9"
				>
					{isUploading
						? 'Uploading...'
						: `Upload ${pendingCount} photo${pendingCount > 1 ? 's' : ''}`}
				</Button>
			)}
		</div>
	)
}
