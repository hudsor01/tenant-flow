import type { PipeTransform } from '@nestjs/common'
import { Injectable, BadRequestException } from '@nestjs/common'

/**
 * Explicit MIME type whitelist for image/document uploads.
 * SVG is intentionally excluded — it can contain XSS payloads.
 * GIF is excluded from image uploads to avoid animated content abuse.
 */
export const ALLOWED_IMAGE_MIME_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp'
])

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/msword',
	'text/csv',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-excel'
])

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
	...ALLOWED_IMAGE_MIME_TYPES,
	...ALLOWED_DOCUMENT_MIME_TYPES
])

/**
 * FileSizeValidationPipe
 *
 * Validates file upload sizes to prevent abuse and ensure reasonable limits.
 *
 * Default Limits:
 * - Images: 5MB
 * - Documents (PDF, DOCX): 10MB
 * - Spreadsheets (CSV, XLSX): 5MB
 * - Videos: 50MB
 * - Other files: 2MB
 *
 * Usage:
 * @Post('upload')
 * @UseInterceptors(FileInterceptor('file'))
 * async uploadFile(@UploadedFile(new FileSizeValidationPipe()) file: Express.Multer.File) {
 *   // File is validated
 * }
 *
 * Custom size:
 * @UploadedFile(new FileSizeValidationPipe({ maxSize: 20 * 1024 * 1024 }))
 */
@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
	private readonly IMAGE_MAX_SIZE = 5 * 1024 * 1024 // 5MB
	private readonly DOCUMENT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
	private readonly SPREADSHEET_MAX_SIZE = 5 * 1024 * 1024 // 5MB
	private readonly VIDEO_MAX_SIZE = 50 * 1024 * 1024 // 50MB
	private readonly DEFAULT_MAX_SIZE = 2 * 1024 * 1024 // 2MB

	constructor(private readonly options?: { maxSize?: number; allowedMimeTypes?: Set<string> }) {}

	transform(value: Express.Multer.File): Express.Multer.File {
		if (!value) {
			throw new BadRequestException('No file uploaded')
		}

		// Validate MIME type against whitelist
		const allowedTypes = this.options?.allowedMimeTypes ?? ALLOWED_UPLOAD_MIME_TYPES
		if (!allowedTypes.has(value.mimetype)) {
			throw new BadRequestException(
				`File type "${value.mimetype}" is not allowed. Accepted types: ${Array.from(allowedTypes).join(', ')}`
			)
		}

		// Use custom max size if provided
		if (this.options?.maxSize) {
			if (value.size > this.options.maxSize) {
				const maxSizeMB = (this.options.maxSize / (1024 * 1024)).toFixed(2)
				const fileSizeMB = (value.size / (1024 * 1024)).toFixed(2)
				throw new BadRequestException(
					`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB`
				)
			}
			return value
		}

		// Determine max size based on file type
		const maxSize = this.getMaxSizeForType(value.mimetype)
		const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)

		if (value.size > maxSize) {
			const fileSizeMB = (value.size / (1024 * 1024)).toFixed(2)
			throw new BadRequestException(
				`File size ${fileSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB for ${this.getFileTypeLabel(value.mimetype)} files`
			)
		}

		return value
	}

	private getMaxSizeForType(mimetype: string): number {
		// Images (uses explicit whitelist, not glob)
		if (ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) {
			return this.IMAGE_MAX_SIZE
		}

		// Documents
		if (
			mimetype === 'application/pdf' ||
			mimetype ===
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			mimetype === 'application/msword'
		) {
			return this.DOCUMENT_MAX_SIZE
		}

		// Spreadsheets
		if (
			mimetype === 'text/csv' ||
			mimetype ===
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			mimetype === 'application/vnd.ms-excel'
		) {
			return this.SPREADSHEET_MAX_SIZE
		}

		// Videos
		if (mimetype.startsWith('video/')) {
			return this.VIDEO_MAX_SIZE
		}

		// Default for unknown types
		return this.DEFAULT_MAX_SIZE
	}

	private getFileTypeLabel(mimetype: string): string {
		if (ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) return 'image'
		if (mimetype === 'application/pdf') return 'PDF'
		if (
			mimetype ===
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
			mimetype === 'application/msword'
		)
			return 'document'
		if (
			mimetype === 'text/csv' ||
			mimetype ===
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		)
			return 'spreadsheet'
		if (mimetype.startsWith('video/')) return 'video'
		return 'file'
	}
}
