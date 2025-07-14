import { useCallback, useEffect, useMemo, useState } from 'react'
import { type FileError, type FileRejection, useDropzone } from 'react-dropzone'
import { trpc } from '@/lib/trpcClient'

interface FileWithPreview extends File {
	preview?: string
	errors: readonly FileError[]
}

interface UseBackendUploadOptions {
	/**
	 * Endpoint path for file upload (e.g., '/properties/upload', '/users/upload-avatar')
	 */
	uploadPath: string
	/**
	 * Allowed MIME types for each file upload (e.g `image/png`, `text/html`, etc). Wildcards are also supported (e.g `image/*`).
	 *
	 * Defaults to allowing uploading of all MIME types.
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
	 * Additional form data to send with the upload
	 */
	additionalData?: Record<string, string>
}

type UseBackendUploadReturn = ReturnType<typeof useBackendUpload>

const useBackendUpload = (options: UseBackendUploadOptions) => {
	const {
		uploadPath,
		allowedMimeTypes = [],
		maxFileSize = Number.POSITIVE_INFINITY,
		maxFiles = 1,
		additionalData = {}
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
					; (file as FileWithPreview).preview =
						URL.createObjectURL(file)
						; (file as FileWithPreview).errors = []
					return file as FileWithPreview
				})

			const invalidFiles = fileRejections.map(({ file, errors }) => {
				; (file as FileWithPreview).preview = URL.createObjectURL(file)
					; (file as FileWithPreview).errors = errors
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

		// Handle partial successes - only upload files that had errors or haven't been uploaded
		const filesWithErrors = errors.map(x => x.name)
		const filesToUpload =
			filesWithErrors.length > 0
				? [
					...files.filter(f => filesWithErrors.includes(f.name)),
					...files.filter(f => !successes.includes(f.name))
				]
				: files

		const responses = await Promise.all(
			filesToUpload.map(async file => {
				try {
					// Use direct HTTP for file upload (tRPC doesn't handle file uploads well)
					const formData = new FormData()
					formData.append('file', file)
					
					// Add additional data to form
					Object.entries(additionalData).forEach(([key, value]) => {
						formData.append(key, value)
					})

					const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '/api/v1'
					const response = await fetch(`${baseUrl}${uploadPath}`, {
						method: 'POST',
						body: formData,
						headers: {
							// Don't set Content-Type - let browser set it with boundary
							'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
						}
					})

					if (!response.ok) {
						throw new Error(`Upload failed: ${response.statusText}`)
					}

					const result = await response.json()
					return {
						name: file.name,
						message: undefined,
						url: result.url
					}
				} catch (error) {
					return {
						name: file.name,
						message:
							error instanceof Error
								? error.message
								: 'Upload failed'
					}
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

		setLoading(false)
	}, [files, uploadPath, errors, successes, additionalData])

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

	return {
		files,
		setFiles,
		successes,
		isSuccess,
		loading,
		errors,
		setErrors,
		onUpload,
		maxFileSize: maxFileSize,
		maxFiles: maxFiles,
		allowedMimeTypes,
		...dropzoneProps
	}
}

// Main export
export const useFileUpload = useBackendUpload

// Backward compatibility alias
export const useSupabaseUpload = useBackendUpload

export {
	useBackendUpload,
	type UseBackendUploadOptions,
	type UseBackendUploadReturn
}

// Export alias for backward compatibility
export type UseFileUploadReturn = UseBackendUploadReturn
