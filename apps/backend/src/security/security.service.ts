import { BadRequestException, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { z } from 'zod'

export interface SanitizationOptions {
	/**
	 * Maximum length allowed for the input
	 * @default 1000
	 */
	maxLength?: number

	/**
	 * Whether to allow control characters (0x00-0x1f and 0x7f)
	 * @default false
	 */
	allowControlChars?: boolean

	/**
	 * Whether to allow null bytes
	 * @default false
	 */
	allowNullBytes?: boolean

	/**
	 * Whether to allow newlines and carriage returns
	 * @default false
	 */
	allowNewlines?: boolean

	/**
	 * Additional characters to remove/escape
	 */
	forbiddenChars?: string

	/**
	 * Whether to allow single quotes (apostrophes)
	 * @default true - for valid business names like "Tenant's Premium Plan"
	 */
	allowApostrophes?: boolean

	/**
	 * Whether to allow Unicode characters
	 * @default true
	 */
	allowUnicode?: boolean

	/**
	 * Character classes to allow (e.g., 'letters', 'numbers', 'punctuation')
	 */
	allowedCharClasses?: string[]
}

export interface CharacterClassValidation {
	letters: boolean
	numbers: boolean
	spaces: boolean
	punctuation: boolean
	special: boolean
	unicode: boolean
}

// Zod schemas for input validation
const SanitizationOptionsSchema = z
	.object({
		maxLength: z.number().min(1).max(10000).optional(),
		allowControlChars: z.boolean().optional(),
		allowNullBytes: z.boolean().optional(),
		allowNewlines: z.boolean().optional(),
		allowApostrophes: z.boolean().optional(),
		allowUnicode: z.boolean().optional(),
		forbiddenChars: z.string().optional(),
		allowedCharClasses: z.array(z.string()).optional()
	})
	.strict()

@Injectable()
export class SecurityService {
	/**
	 * Basic input sanitization - removes dangerous characters while preserving valid business data
	 * Specifically removes angle brackets for XSS prevention but keeps other special characters
	 */
	sanitizeInput(input: string): string {
		return this.sanitizeInputWithOptions(input, {})
	}

	/**
	 * Validates character classes in input string
	 */
	validateCharacterClasses(
		input: string,
		validation: CharacterClassValidation
	): boolean {
		for (let i = 0; i < input.length; i++) {
			const char = input[i]
			if (char === undefined) continue // Skip undefined characters

			const code = char.charCodeAt(0)

			// Check for letters (a-z, A-Z)
			if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
				if (!validation.letters) return false
			}
			// Check for numbers (0-9)
			else if (code >= 48 && code <= 57) {
				if (!validation.numbers) return false
			}
			// Check for spaces
			else if (char === ' ') {
				if (!validation.spaces) return false
			}
			// Check for basic punctuation
			else if (/[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=/-]/.test(char)) {
				if (!validation.punctuation) return false
			}
			// Check for other special characters
			else if (code < 127) {
				if (!validation.special) return false
			}
			// Check for Unicode characters
			else {
				if (!validation.unicode) return false
			}
		}
		return true
	}

	/**
	 * Enhanced input sanitization with options
	 */
	sanitizeInputWithOptions(
		input: string,
		opts: SanitizationOptions = {}
	): string {
		// Validate options using Zod schema
		const validatedOptions = SanitizationOptionsSchema.parse(opts)

		// Apply default options with proper type safety
		const options = {
			...validatedOptions,
			maxLength: validatedOptions.maxLength ?? 1000,
			allowControlChars: validatedOptions.allowControlChars ?? false,
			allowNullBytes: validatedOptions.allowNullBytes ?? false,
			allowNewlines: validatedOptions.allowNewlines ?? false,
			allowApostrophes: validatedOptions.allowApostrophes ?? true,
			allowUnicode: validatedOptions.allowUnicode ?? true
		}

		// Simplified null check - replace strict null check with combined null/undefined check
		if (input === null || input === undefined) {
			throw new BadRequestException('Input cannot be null or undefined')
		}

		if (typeof input !== 'string') {
			throw new BadRequestException('Input must be a string')
		}

		// Simplified maxLength check - remove unnecessary non-null assertion
		if (input.length > options.maxLength) {
			throw new BadRequestException(
				`Input exceeds maximum length of ${options.maxLength} characters`
			)
		}

		// Check for control characters
		if (!options.allowControlChars) {
			for (let i = 0; i < input.length; i++) {
				const charCode = input.charCodeAt(i)
				if ((charCode >= 0x00 && charCode <= 0x1f) || charCode === 0x7f) {
					throw new BadRequestException('Input contains control characters')
				}
			}
		}

		// Check for null bytes using charCodeAt instead of regex
		if (!options.allowNullBytes) {
			for (let i = 0; i < input.length; i++) {
				if (input.charCodeAt(i) === 0) {
					throw new BadRequestException('Input contains null bytes')
				}
			}
		}

		// Check for newlines if not allowed
		if (
			!options.allowNewlines &&
			(input.includes('\n') || input.includes('\r'))
		) {
			throw new BadRequestException(
				'Input contains newlines or carriage returns'
			)
		}

		// Unicode normalization
		const normalizedValue = input.normalize('NFKC')

		// Remove angle brackets for XSS protection but keep other characters
		// This preserves quotes, apostrophes and other business-valid characters
		let sanitized = normalizedValue.replace(/[<>]/g, '') // Remove only angle brackets

		// Remove forbidden characters if specified
		if (options.forbiddenChars) {
			const forbiddenRegex = new RegExp(
				`[${options.forbiddenChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
				'g'
			)
			sanitized = sanitized.replace(forbiddenRegex, '')
		}

		// Handle apostrophes if not allowed
		if (!options.allowApostrophes) {
			sanitized = sanitized.replace(/['"]/g, '')
		}

		// Handle Unicode if not allowed
		if (!options.allowUnicode) {
			// Remove non-ASCII characters (keep only characters 0-127)
			let asciiOnly = ''
			for (let i = 0; i < sanitized.length; i++) {
				const char = sanitized.charAt(i)
				const code = char.charCodeAt(0)
				if (code >= 0 && code <= 127) {
					asciiOnly += char
				}
			}
			sanitized = asciiOnly
		}

		sanitized = sanitized.trim()

		// Check if after sanitization, we only have dangerous characters or empty string
		if (sanitized.length === 0 && input.trim().length > 0) {
			throw new BadRequestException('Input contains only invalid characters')
		}

		return sanitized
	}

	validateEmail(email: string): boolean {
		// Comprehensive email validation
		// 1. Check for spaces
		if (email.includes(' ')) {
			return false
		}

		// 2. Check basic format requirements
		if (!email || email.length > 254) {
			return false
		}

		// 3. Check for proper email format with regex
		const emailRegex =
			/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
		if (!emailRegex.test(email)) {
			return false
		}

		// 4. Additional checks for common invalid patterns
		const parts = email.split('@')
		if (parts.length !== 2) {
			return false
		}

		const localPart = parts[0]
		const domainPart = parts[1]

		// Check local part (before @)
		if (localPart && localPart.length > 64) {
			return false
		}

		// Check for invalid patterns in local part
		if (localPart && (localPart.startsWith('.') || localPart.endsWith('.'))) {
			return false
		}

		if (localPart && localPart.includes('..')) {
			// consecutive dots
			return false
		}

		// Check domain part (after @)
		if (domainPart && domainPart.length > 253) {
			return false
		}

		// Require at least one dot in domain (must have TLD)
		if (domainPart && !domainPart.includes('.')) {
			return false
		}

		if (
			domainPart &&
			(domainPart.startsWith('-') || domainPart.endsWith('-'))
		) {
			return false
		}

		// Check for double dots in domain
		if (domainPart && domainPart.includes('..')) {
			return false
		}

		return true
	}

	/**
	 * Hash a password using bcrypt with 12 rounds (OWASP recommended)
	 * @param password - Plain text password to hash
	 * @returns Hashed password
	 */
	async hashPassword(password: string): Promise<string> {
		const saltRounds = 12 // OWASP recommended minimum
		return bcrypt.hash(password, saltRounds)
	}

	/**
	 * Validate a password against a bcrypt hash
	 * @param password - Plain text password to validate
	 * @param hashedPassword - Bcrypt hash to compare against
	 * @returns True if password matches hash
	 */
	async validatePassword(
		password: string,
		hashedPassword: string
	): Promise<boolean> {
		return bcrypt.compare(password, hashedPassword)
	}
}
