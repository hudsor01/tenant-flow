import { BadRequestException } from '@nestjs/common'
import type { MultipartFile } from '@fastify/multipart'
import * as crypto from 'crypto'

// Security constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2MB

// Allowed MIME types (restrictive whitelist)
const ALLOWED_IMAGE_TYPES = new Set([
	'image/jpeg',
	'image/jpg', 
	'image/png',
	'image/gif'
])

const ALLOWED_DOCUMENT_TYPES = new Set([
	'application/pdf',
	'application/msword',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

// File signature validation (magic bytes)
const FILE_SIGNATURES = new Map([
	['image/jpeg', [Buffer.from([0xFF, 0xD8, 0xFF])]], // JPEG
	['image/png', [Buffer.from([0x89, 0x50, 0x4E, 0x47])]], // PNG
	['image/gif', [Buffer.from([0x47, 0x49, 0x46, 0x38])]], // GIF
	['application/pdf', [Buffer.from([0x25, 0x50, 0x44, 0x46])]], // PDF
])

/**
 * Validate file signature against MIME type to prevent spoofing
 */
async function validateFileSignature(file: MultipartFile, declaredType: string): Promise<void> {
	if (!FILE_SIGNATURES.has(declaredType)) {
		return // Skip validation for types without signatures
	}

	const buffer = await readFileBytes(file, 10) // Read first 10 bytes
	const expectedSignatures = FILE_SIGNATURES.get(declaredType)!
	
	const isValid = expectedSignatures.some(signature => 
		buffer.subarray(0, signature.length).equals(signature)
	)

	if (!isValid) {
		throw new BadRequestException('File content does not match declared type')
	}
}

/**
 * Read first N bytes from file for signature validation
 */
async function readFileBytes(file: MultipartFile, bytes: number): Promise<Buffer> {
	const chunks: Buffer[] = []
	let totalBytes = 0
	
	for await (const chunk of file.file) {
		chunks.push(chunk)
		totalBytes += chunk.length
		if (totalBytes >= bytes) break
	}
	
	return Buffer.concat(chunks, Math.min(totalBytes, bytes))
}

/**
 * Validate image file with comprehensive security checks
 * Accepts: jpg, jpeg, png, gif
 * Limit: 5MB
 */
export async function validateImageFile(file: MultipartFile): Promise<void> {
	// Basic validation
	if (!file || !file.mimetype || !file.filename) {
		throw new BadRequestException('Invalid file provided')
	}

	// MIME type validation (strict whitelist)
	if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
		throw new BadRequestException('Only JPEG, PNG, and GIF images are allowed')
	}

	// File size validation
	if (file.file.readableLength && file.file.readableLength > MAX_IMAGE_SIZE) {
		throw new BadRequestException(`Image file size cannot exceed ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`)
	}

	// Filename validation (prevent path traversal)
	if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
		throw new BadRequestException('Invalid filename detected')
	}

	// File extension validation
	const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif']
	const fileExt = file.filename.toLowerCase().split('.').pop()
	if (!fileExt || !allowedExtensions.includes(`.${fileExt}`)) {
		throw new BadRequestException('Invalid file extension')
	}

	// Content validation (magic bytes)
	await validateFileSignature(file, file.mimetype)
}

/**
 * Validate document file with comprehensive security checks
 * Accepts: pdf, doc, docx
 * Limit: 10MB
 */
export async function validateDocumentFile(file: MultipartFile): Promise<void> {
	// Basic validation
	if (!file || !file.mimetype || !file.filename) {
		throw new BadRequestException('Invalid file provided')
	}

	// MIME type validation (strict whitelist)
	if (!ALLOWED_DOCUMENT_TYPES.has(file.mimetype)) {
		throw new BadRequestException('Only PDF and Word documents are allowed')
	}

	// File size validation
	if (file.file.readableLength && file.file.readableLength > MAX_DOCUMENT_SIZE) {
		throw new BadRequestException(`Document size cannot exceed ${MAX_DOCUMENT_SIZE / (1024 * 1024)}MB`)
	}

	// Filename validation (prevent path traversal)
	if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
		throw new BadRequestException('Invalid filename detected')
	}

	// File extension validation
	const allowedExtensions = ['.pdf', '.doc', '.docx']
	const fileExt = file.filename.toLowerCase().split('.').pop()
	if (!fileExt || !allowedExtensions.includes(`.${fileExt}`)) {
		throw new BadRequestException('Invalid document file extension')
	}

	// Content validation (magic bytes) - only for PDF for now
	if (file.mimetype === 'application/pdf') {
		await validateFileSignature(file, file.mimetype)
	}
}

/**
 * Validate file with custom options and security checks
 */
export async function validateFile(file: MultipartFile, options: {
	allowedTypes?: Set<string>
	maxSize?: number
	errorMessage?: string
	allowedExtensions?: string[]
} = {}): Promise<void> {
	const {
		allowedTypes,
		maxSize = 10 * 1024 * 1024,
		errorMessage = 'File type not allowed',
		allowedExtensions = []
	} = options

	// Basic validation
	if (!file || !file.mimetype || !file.filename) {
		throw new BadRequestException('Invalid file provided')
	}

	// MIME type validation
	if (allowedTypes && !allowedTypes.has(file.mimetype)) {
		throw new BadRequestException(errorMessage)
	}

	// File size validation
	if (file.file.readableLength && file.file.readableLength > maxSize) {
		throw new BadRequestException(`File size cannot exceed ${maxSize / (1024 * 1024)}MB`)
	}

	// Filename validation (prevent path traversal)
	if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
		throw new BadRequestException('Invalid filename detected')
	}

	// File extension validation
	if (allowedExtensions.length > 0) {
		const fileExt = file.filename.toLowerCase().split('.').pop()
		if (!fileExt || !allowedExtensions.includes(`.${fileExt}`)) {
			throw new BadRequestException('Invalid file extension')
		}
	}
}

/**
 * Validate avatar file with enhanced security checks
 * Accepts: jpg, jpeg, png
 * Limit: 2MB
 */
export async function validateAvatarFile(file: MultipartFile): Promise<void> {
	// Basic validation
	if (!file || !file.mimetype || !file.filename) {
		throw new BadRequestException('Invalid file provided')
	}

	// MIME type validation (restricted set for avatars)
	const allowedAvatarTypes = new Set(['image/jpeg', 'image/jpg', 'image/png'])
	if (!allowedAvatarTypes.has(file.mimetype)) {
		throw new BadRequestException('Only JPEG and PNG files are allowed for avatars')
	}

	// File size validation (smaller limit for avatars)
	if (file.file.readableLength && file.file.readableLength > MAX_AVATAR_SIZE) {
		throw new BadRequestException(`Avatar size cannot exceed ${MAX_AVATAR_SIZE / (1024 * 1024)}MB`)
	}

	// Filename validation (prevent path traversal)
	if (file.filename.includes('..') || file.filename.includes('/') || file.filename.includes('\\')) {
		throw new BadRequestException('Invalid filename detected')
	}

	// File extension validation
	const allowedExtensions = ['.jpg', '.jpeg', '.png']
	const fileExt = file.filename.toLowerCase().split('.').pop()
	if (!fileExt || !allowedExtensions.includes(`.${fileExt}`)) {
		throw new BadRequestException('Invalid avatar file extension')
	}

	// Content validation (magic bytes)
	await validateFileSignature(file, file.mimetype)
}

/**
 * Helper function to convert MultipartFile to Buffer for storage with size limits
 */
export async function multipartFileToBuffer(file: MultipartFile, maxSize = MAX_DOCUMENT_SIZE): Promise<Buffer> {
	const chunks: Buffer[] = []
	let totalSize = 0
	
	for await (const chunk of file.file) {
		totalSize += chunk.length
		if (totalSize > maxSize) {
			throw new BadRequestException('File size exceeds maximum allowed size')
		}
		chunks.push(chunk)
	}
	
	return Buffer.concat(chunks)
}

/**
 * Generate a secure filename to prevent predictable file access
 */
export function generateSecureFilename(originalFilename: string, userId?: string): string {
	// Get file extension safely
	const extension = originalFilename.toLowerCase().split('.').pop() || 'bin'
	
	// Generate cryptographically secure random string
	const timestamp = Date.now()
	const randomBytes = crypto.randomBytes(16).toString('hex')
	const userHash = userId ? crypto.createHash('sha256').update(userId).digest('hex').substring(0, 8) : 'anon'
	
	// Create secure filename: timestamp-randomBytes-userHash.extension
	return `${timestamp}-${randomBytes}-${userHash}.${extension}`
}

/**
 * Sanitize original filename for logging/display purposes
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars
		.substring(0, 100) // Limit length
}

/**
 * Comprehensive file validation that combines all security checks
 */
export async function validateUploadedFile(
	file: MultipartFile, 
	type: 'image' | 'document' | 'avatar',
	userId?: string
): Promise<{ isValid: boolean; secureFilename: string; sanitizedOriginalName: string }> {
	try {
		// Perform type-specific validation
		switch (type) {
			case 'image':
				await validateImageFile(file)
				break
			case 'document':
				await validateDocumentFile(file)
				break
			case 'avatar':
				await validateAvatarFile(file)
				break
			default:
				throw new BadRequestException('Invalid file type specified')
		}

		return {
			isValid: true,
			secureFilename: generateSecureFilename(file.filename, userId),
			sanitizedOriginalName: sanitizeFilename(file.filename)
		}
	} catch (error) {
		throw error // Re-throw validation errors
	}
}