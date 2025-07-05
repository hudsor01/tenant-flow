import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'
import { apiClient } from '@/lib/api-client'
import { toast } from 'sonner'
import type { FileUploadResponse } from '@/types/api'

interface FileWithPreview extends File {
	preview?: string
	errors: readonly FileError[]
}

interface UseFileUploadOptions {
	/**
	 * API endpoint to upload files to (e.g., '/properties/:id/upload-image')
	 */
	endpoint: string
	/**
	 * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
	 */
	allowedMimeTypes?: string[]
	/**
	 * Maximum upload size of each file allowed in bytes. (e.g 1000 bytes = 1 KB)
	 */
	maxFileSize?: number
	/**
	 * Maximum number of files allowed per upload.
	 */
	maxFiles?: number
	/**
	 * Additional form data to send with the file
	 */
	additionalData?: Record<string, string>
	/**
	 * Callback when upload is successful
	 */
	onSuccess?: (response: FileUploadResponse) => void
	/**
	 * Callback when upload fails
	 */
	onError?: (error: Error) => void
}

type UseFileUploadReturn = ReturnType<typeof useFileUpload>

const useFileUpload = (options: UseFileUploadOptions) => {
	const {
		endpoint,
		allowedMimeTypes = [],
		maxFileSize = 10 * 1024 * 1024, // 10MB default
		maxFiles = 1,
		additionalData,
		onSuccess,
		onError
	} = options

	const [files, setFiles] = useState<FileWithPreview[]>([])
	const [loading, setLoading] = useState<boolean>(false)
	const [errors, setErrors] = useState<{ name: string; message: string }[]>(
		[]
	)
	const [successes, setSuccesses] = useState<string[]>([])

	const isSuccess = useMemo(() => {
		if (errors.length === 0 && successes.length === 0) {
			return false
		}
		if (errors.length === 0 && successes.length === files.length) {
			return true
		}
		return false
	}, [errors.length, successes.length, files.length])

	const onDrop = useCallback(
		(acceptedFiles: File[], fileRejections: FileRejection[]) => {
			const validFiles = acceptedFiles
				.filter(file => !files.find(x => x.name === file.name))
				.map(file => {
					;(file as FileWithPreview).preview =
						URL.createObjectURL(file)
					;(file as FileWithPreview).errors = []
					return file as FileWithPreview
				})

			const invalidFiles = fileRejections.map(({ file, errors }) => {
				;(file as FileWithPreview).preview = URL.createObjectURL(file)
				;(file as FileWithPreview).errors = errors
				return file as FileWithPreview
			})

			const newFiles = [...files, ...validFiles, ...invalidFiles]
			setFiles(newFiles)
		},
		[files, setFiles]
	)

	const dropzoneProps = useDropzone({
		onDrop,
		noClick: true,
		accept: allowedMimeTypes.reduce(
			(acc, type) => ({ ...acc, [type]: [] }),
			{}
		),
		maxSize: maxFileSize,
		maxFiles: maxFiles,
		multiple: maxFiles !== 1
	})

	const onUpload = useCallback(async () => {
		setLoading(true)

		// Only upload files that haven't succeeded yet
		const filesWithErrors = errors.map(x => x.name)
		const filesToUpload =
			filesWithErrors.length > 0
				? [
						...files.filter(f => filesWithErrors.includes(f.name)),
						...files.filter(f => !successes.includes(f.name))
					]
				: files.filter(f => !successes.includes(f.name))

		const responses = await Promise.all(
			filesToUpload.map(async file => {
				try {
					const response =
						await apiClient.uploadFile<FileUploadResponse>(
							endpoint,
							file,
							additionalData
						)

					onSuccess?.(response)
					return { name: file.name, message: undefined, response }
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : 'Upload failed'
					onError?.(
						error instanceof Error ? error : new Error(errorMessage)
					)
					return { name: file.name, message: errorMessage }
				}
			})
		)

		const responseErrors = responses.filter(x => x.message !== undefined)
		setErrors(responseErrors)

		const responseSuccesses = responses.filter(x => x.message === undefined)
		const newSuccesses = Array.from(
			new Set([...successes, ...responseSuccesses.map(x => x.name)])
		)
		setSuccesses(newSuccesses)

		// Show toast notifications
		if (responseErrors.length > 0) {
			toast.error(`Failed to upload ${responseErrors.length} file(s)`)
		}
		if (responseSuccesses.length > 0) {
			toast.success(
				`Successfully uploaded ${responseSuccesses.length} file(s)`
			)
		}

		setLoading(false)
	}, [files, endpoint, errors, successes, additionalData, onSuccess, onError])

	const removeFile = useCallback((fileName: string) => {
		setFiles(prevFiles => {
			const updatedFiles = prevFiles.filter(f => f.name !== fileName)
			// Clean up preview URLs
			const fileToRemove = prevFiles.find(f => f.name === fileName)
			if (fileToRemove?.preview) {
				URL.revokeObjectURL(fileToRemove.preview)
			}
			return updatedFiles
		})
		setSuccesses(prev => prev.filter(name => name !== fileName))
		setErrors(prev => prev.filter(error => error.name !== fileName))
	}, [])

	const resetUpload = useCallback(() => {
		// Clean up preview URLs
		files.forEach(file => {
			if (file.preview) {
				URL.revokeObjectURL(file.preview)
			}
		})

		setFiles([])
		setErrors([])
		setSuccesses([])
	}, [files])

	useEffect(() => {
		if (files.length === 0) {
			setErrors([])
		}

		// If the number of files doesn't exceed the maxFiles parameter, remove the error 'Too many files' from each file
		if (files.length <= maxFiles) {
			let changed = false
			const newFiles = files.map(file => {
				if (file.errors.some(e => e.code === 'too-many-files')) {
					file.errors = file.errors.filter(
						e => e.code !== 'too-many-files'
					)
					changed = true
				}
				return file
			})
			if (changed) {
				setFiles(newFiles)
			}
		}
	}, [files, files.length, setFiles, maxFiles])

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			files.forEach(file => {
				if (file.preview) {
					URL.revokeObjectURL(file.preview)
				}
			})
		}
	}, [files])

	return {
		files,
		setFiles,
		successes,
		isSuccess,
		loading,
		errors,
		setErrors,
		onUpload,
		removeFile,
		resetUpload,
		maxFileSize,
		maxFiles,
		allowedMimeTypes,
		...dropzoneProps
	}
}

export { useFileUpload, type UseFileUploadOptions, type UseFileUploadReturn }
