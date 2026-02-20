'use client'

import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import type { FileWithStatus } from './sections/property-images-create-section'

interface UsePropertyImageDropzoneParams {
	setFilesWithStatus: (
		updater: (prev: FileWithStatus[]) => FileWithStatus[]
	) => void
}

export function usePropertyImageDropzone({
	setFilesWithStatus
}: UsePropertyImageDropzoneParams) {
	return useDropzone({
		accept: {
			'image/jpeg': ['.jpg', '.jpeg'],
			'image/png': ['.png'],
			'image/webp': ['.webp'],
			'image/gif': ['.gif']
		},
		maxSize: 10 * 1024 * 1024,
		maxFiles: 10,
		onDrop: acceptedFiles => {
			const newFiles: FileWithStatus[] = acceptedFiles.map(file => ({
				file,
				status: 'pending' as const,
				objectUrl: URL.createObjectURL(file)
			}))
			setFilesWithStatus(prev => [...prev, ...newFiles].slice(0, 10))
		},
		onDropRejected: fileRejections => {
			for (const { file, errors } of fileRejections) {
				for (const error of errors) {
					if (error.code === 'file-too-large') {
						toast.error(`"${file.name}" is too large (max 10MB)`)
					} else if (error.code === 'file-invalid-type') {
						toast.error(
							`"${file.name}" is not supported. Use JPEG, PNG, WebP, or GIF.`
						)
					} else if (error.code === 'too-many-files') {
						toast.error('Maximum 10 images per property')
					} else {
						toast.error(`"${file.name}" could not be added`)
					}
				}
			}
		}
	})
}
