import { UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

/**
 * Standard image upload decorator
 * Accepts: jpg, jpeg, png, gif
 * Default limit: 10MB
 */
export function ImageUpload(maxSize: number = 10 * 1024 * 1024) {
	return UseInterceptors(
		FileInterceptor('file', {
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return cb(new Error('Only image files are allowed!'), false)
				}
				cb(null, true)
			},
			limits: { fileSize: maxSize }
		})
	)
}

/**
 * Standard document upload decorator
 * Accepts: pdf, doc, docx
 * Default limit: 10MB
 */
export function DocumentUpload(maxSize: number = 10 * 1024 * 1024) {
	return UseInterceptors(
		FileInterceptor('file', {
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/)) {
					return cb(new Error('Only PDF and Word documents are allowed!'), false)
				}
				cb(null, true)
			},
			limits: { fileSize: maxSize }
		})
	)
}

/**
 * Generic file upload decorator with custom options
 */
export function FileUpload(options: {
	allowedTypes?: RegExp
	maxSize?: number
	fieldName?: string
	errorMessage?: string
}) {
	const {
		allowedTypes = /\//,
		maxSize = 10 * 1024 * 1024,
		fieldName = 'file',
		errorMessage = 'File type not allowed'
	} = options

	return UseInterceptors(
		FileInterceptor(fieldName, {
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(allowedTypes)) {
					return cb(new Error(errorMessage), false)
				}
				cb(null, true)
			},
			limits: { fileSize: maxSize }
		})
	)
}

/**
 * Avatar upload decorator specifically for user profiles
 * Accepts: jpg, jpeg, png
 * Limit: 5MB
 */
export function AvatarUpload() {
	return UseInterceptors(
		FileInterceptor('avatar', {
			fileFilter: (req, file, cb) => {
				if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
					return cb(new Error('Only JPG, JPEG, and PNG files are allowed for avatars!'), false)
				}
				cb(null, true)
			},
			limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit for avatars
		})
	)
}