import type { FileUploadProps } from './types'

interface ValidationCallbacks {
	onFileValidate?: FileUploadProps['onFileValidate']
	onFileReject?: FileUploadProps['onFileReject']
}

interface ValidationOptions {
	acceptTypes: string[] | null
	maxSize?: number | undefined
	maxFiles?: number | undefined
	currentFileCount: number
}

interface ValidationResult {
	acceptedFiles: File[]
	isInvalid: boolean
}

/**
 * Applies maxFiles limit, returning files to process and rejected overflow files.
 */
function applyMaxFilesLimit(
	files: File[],
	maxFiles: number,
	currentCount: number,
	callbacks: ValidationCallbacks
): { filesToProcess: File[]; isInvalid: boolean } {
	const remainingSlotCount = Math.max(0, maxFiles - currentCount)

	if (remainingSlotCount >= files.length) {
		return { filesToProcess: files, isInvalid: false }
	}

	const filesToProcess = files.slice(0, remainingSlotCount)
	const rejectedFiles = files.slice(remainingSlotCount)

	for (const file of rejectedFiles) {
		let rejectionMessage = `Maximum ${maxFiles} files allowed`

		if (callbacks.onFileValidate) {
			const validationMessage = callbacks.onFileValidate(file)
			if (validationMessage) {
				rejectionMessage = validationMessage
			}
		}

		callbacks.onFileReject?.(file, rejectionMessage)
	}

	return { filesToProcess, isInvalid: true }
}

/**
 * Validates a single file against type and size constraints.
 * Returns rejection message or null if accepted.
 */
function validateFile(
	file: File,
	acceptTypes: string[] | null,
	maxSize: number | undefined
): string | null {
	if (acceptTypes) {
		const fileType = file.type
		const fileExtension = `.${file.name.split('.').pop()}`

		if (
			!acceptTypes.some(
				(type) =>
					type === fileType ||
					type === fileExtension ||
					(type.includes('/*') &&
						fileType.startsWith(type.replace('/*', '/')))
			)
		) {
			return 'File type not accepted'
		}
	}

	if (maxSize && file.size > maxSize) {
		return 'File too large'
	}

	return null
}

/**
 * Validates an array of files against all constraints (custom validation,
 * type acceptance, size limits, and max file count).
 *
 * Returns accepted files and whether any validation errors occurred.
 */
export function validateFiles(
	originalFiles: File[],
	options: ValidationOptions,
	callbacks: ValidationCallbacks
): ValidationResult {
	let filesToProcess = [...originalFiles]
	let isInvalid = false

	if (options.maxFiles) {
		const result = applyMaxFilesLimit(
			filesToProcess,
			options.maxFiles,
			options.currentFileCount,
			callbacks
		)
		filesToProcess = result.filesToProcess
		isInvalid = result.isInvalid
	}

	const acceptedFiles: File[] = []

	for (const file of filesToProcess) {
		if (callbacks.onFileValidate) {
			const validationMessage = callbacks.onFileValidate(file)
			if (validationMessage) {
				callbacks.onFileReject?.(file, validationMessage)
				isInvalid = true
				continue
			}
		}

		const rejectionMessage = validateFile(file, options.acceptTypes, options.maxSize)
		if (rejectionMessage) {
			callbacks.onFileReject?.(file, rejectionMessage)
			isInvalid = true
		} else {
			acceptedFiles.push(file)
		}
	}

	return { acceptedFiles, isInvalid }
}
