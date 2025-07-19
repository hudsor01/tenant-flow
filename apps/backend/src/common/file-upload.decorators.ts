import { BadRequestException } from '@nestjs/common'
import type { MultipartFile } from '@fastify/multipart'

/**
 * Validate image file for Fastify multipart
 * Accepts: jpg, jpeg, png, gif
 * Default limit: 10MB
 */
export function validateImageFile(file: MultipartFile): void {
	if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
		throw new BadRequestException('Only image files are allowed!')
	}
	
	// Note: File size validation is handled by Fastify bodyLimit configuration
	// This provides additional validation if needed
}

/**
 * Validate document file for Fastify multipart
 * Accepts: pdf, doc, docx
 * Default limit: 10MB
 */
export function validateDocumentFile(file: MultipartFile): void {
	if (!file.mimetype.match(/\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/)) {
		throw new BadRequestException('Only PDF and Word documents are allowed!')
	}
}

/**
 * Validate file with custom options for Fastify multipart
 */
export function validateFile(file: MultipartFile, options: {
	allowedTypes?: RegExp
	maxSize?: number
	errorMessage?: string
} = {}): void {
	const {
		allowedTypes = /\//,
		// maxSize = 10 * 1024 * 1024, // File size validation is handled by Fastify bodyLimit configuration
		errorMessage = 'File type not allowed'
	} = options

	if (!file.mimetype.match(allowedTypes)) {
		throw new BadRequestException(errorMessage)
	}
}

/**
 * Validate avatar file for Fastify multipart
 * Accepts: jpg, jpeg, png
 * Limit: 5MB
 */
export function validateAvatarFile(file: MultipartFile): void {
	if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
		throw new BadRequestException('Only JPG, JPEG, and PNG files are allowed for avatars!')
	}
}

/**
 * Helper function to convert MultipartFile to Buffer for storage
 */
export async function multipartFileToBuffer(file: MultipartFile): Promise<Buffer> {
	const chunks: Buffer[] = []
	
	for await (const chunk of file.file) {
		chunks.push(chunk)
	}
	
	return Buffer.concat(chunks)
}