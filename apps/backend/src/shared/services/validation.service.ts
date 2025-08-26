import { BadRequestException, Injectable } from '@nestjs/common'
import { validate } from 'class-validator'
import { type ClassConstructor, plainToClass } from 'class-transformer'
import { z } from 'zod'

/**
 * Validation result interface
 */
export interface ValidationResult {
	isValid: boolean
	errors: ValidationError[]
}

export interface ValidationError {
	field: string
	message: string
	value?: unknown
}

/**
 * Unified Validation Service
 * Eliminates DRY violations in validation logic across the application
 */
@Injectable()
export class ValidationService {
	/**
	 * Common email regex pattern - single source of truth
	 */
	private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

	/**
	 * Common password patterns
	 */
	private static readonly PASSWORD_PATTERNS = {
		MIN_LENGTH: 8,
		UPPERCASE: /[A-Z]/,
		LOWERCASE: /[a-z]/,
		NUMBER: /[0-9]/,
		SPECIAL_CHAR: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
	}

	/**
	 * Common phone patterns
	 */
	private static readonly PHONE_PATTERNS = {
		US: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
		INTERNATIONAL: /^\+?[1-9]\d{1,14}$/
	}

	/**
	 * Zod schemas for enhanced validation
	 */
	private static readonly ZOD_SCHEMAS = {
		email: z.string().email('Invalid email format'),
		
		password: z.string()
			.min(8, 'Password must be at least 8 characters long')
			.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
			.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
			.regex(/[0-9]/, 'Password must contain at least one number')
			.regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character'),
		
		phoneUS: z.string().regex(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, 'Invalid US phone number format'),
		
		phoneInternational: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid international phone number format'),
		
		uuid: z.string().uuid('Invalid UUID format'),
		
		url: z.string().url('Invalid URL format'),
		
		positiveNumber: z.number().positive('Must be a positive number'),
		
		dateString: z.string().datetime('Invalid date format'),
		
		nonEmptyString: z.string().min(1, 'Field cannot be empty').trim(),
		
		currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'], {
			message: 'Invalid currency code'
		}),
		
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'], {
			message: 'Invalid priority level'
		}),
		
		userRole: z.enum(['OWNER', 'MANAGER', 'TENANT', 'ADMIN'], {
			message: 'Invalid user role'
		})
	}

	/**
	 * Validates email format
	 */
	validateEmail(email: string): ValidationResult {
		const isValid = ValidationService.EMAIL_REGEX.test(email)
		return {
			isValid,
			errors: isValid ? [] : [{
				field: 'email',
				message: 'Invalid email format',
				value: email
			}]
		}
	}

	/**
	 * Validates password strength
	 */
	validatePassword(password: string): ValidationResult {
		const errors: ValidationError[] = []
		const { MIN_LENGTH, UPPERCASE, LOWERCASE, NUMBER, SPECIAL_CHAR } = ValidationService.PASSWORD_PATTERNS

		if (!password || password.length < MIN_LENGTH) {
			errors.push({
				field: 'password',
				message: `Password must be at least ${MIN_LENGTH} characters long`
			})
		}

		if (!UPPERCASE.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one uppercase letter'
			})
		}

		if (!LOWERCASE.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one lowercase letter'
			})
		}

		if (!NUMBER.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one number'
			})
		}

		if (!SPECIAL_CHAR.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one special character'
			})
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Validates phone number format
	 */
	validatePhone(phone: string, country: 'US' | 'INTERNATIONAL' = 'US'): ValidationResult {
		const pattern = ValidationService.PHONE_PATTERNS[country]
		const isValid = pattern.test(phone)
		
		return {
			isValid,
			errors: isValid ? [] : [{
				field: 'phone',
				message: `Invalid ${country.toLowerCase()} phone number format`,
				value: phone
			}]
		}
	}

	/**
	 * Validates required fields are not empty
	 */
	validateRequired(data: Record<string, unknown>, fields: string[]): ValidationResult {
		const errors: ValidationError[] = []

		for (const field of fields) {
			const value = data[field]
			if (!value || (typeof value === 'string' && value.trim() === '')) {
				errors.push({
					field,
					message: `${field} is required`,
					value
				})
			}
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Validates string length constraints
	 */
	validateStringLength(
		value: string,
		field: string,
		min?: number,
		max?: number
	): ValidationResult {
		const errors: ValidationError[] = []

		if (min !== undefined && value.length < min) {
			errors.push({
				field,
				message: `${field} must be at least ${min} characters long`,
				value
			})
		}

		if (max !== undefined && value.length > max) {
			errors.push({
				field,
				message: `${field} must not exceed ${max} characters`,
				value
			})
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Validates numeric range
	 */
	validateNumericRange(
		value: number,
		field: string,
		min?: number,
		max?: number
	): ValidationResult {
		const errors: ValidationError[] = []

		if (min !== undefined && value < min) {
			errors.push({
				field,
				message: `${field} must be at least ${min}`,
				value
			})
		}

		if (max !== undefined && value > max) {
			errors.push({
				field,
				message: `${field} must not exceed ${max}`,
				value
			})
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Validates date range
	 */
	validateDateRange(
		date: Date,
		field: string,
		minDate?: Date,
		maxDate?: Date
	): ValidationResult {
		const errors: ValidationError[] = []

		if (minDate && date < minDate) {
			errors.push({
				field,
				message: `${field} must be after ${minDate.toDateString()}`,
				value: date
			})
		}

		if (maxDate && date > maxDate) {
			errors.push({
				field,
				message: `${field} must be before ${maxDate.toDateString()}`,
				value: date
			})
		}

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Validates UUID format
	 */
	validateUUID(value: string, field = 'id'): ValidationResult {
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		const isValid = uuidRegex.test(value)

		return {
			isValid,
			errors: isValid ? [] : [{
				field,
				message: 'Invalid UUID format',
				value
			}]
		}
	}

	/**
	 * Validates URL format
	 */
	validateURL(value: string, field = 'url'): ValidationResult {
		try {
			new URL(value)
			return { isValid: true, errors: [] }
		} catch {
			return {
				isValid: false,
				errors: [{
					field,
					message: 'Invalid URL format',
					value
				}]
			}
		}
	}

	/**
	 * Validates using class-validator decorators
	 */
	async validateDTO<T extends object>(
		dtoClass: ClassConstructor<T>,
		data: unknown
	): Promise<ValidationResult> {
		const dto = plainToClass(dtoClass, data)
		const validationErrors = await validate(dto)

		const errors: ValidationError[] = validationErrors.flatMap(error => 
			Object.values(error.constraints ?? {}).map(message => ({
				field: error.property,
				message,
				value: error.value
			}))
		)

		return {
			isValid: errors.length === 0,
			errors
		}
	}

	/**
	 * Combines multiple validation results
	 */
	combineValidationResults(...results: ValidationResult[]): ValidationResult {
		const allErrors = results.flatMap(result => result.errors)
		return {
			isValid: allErrors.length === 0,
			errors: allErrors
		}
	}

	/**
	 * Throws BadRequestException if validation fails
	 */
	assertValid(result: ValidationResult): void {
		if (!result.isValid) {
			throw new BadRequestException({
				message: 'Validation failed',
				errors: result.errors
			})
		}
	}

	/**
	 * Validates business-specific rules
	 */
	validateBusinessRules = {
		/**
		 * Validates lease date constraints
		 */
		leaseDates: (startDate: Date, endDate: Date): ValidationResult => {
			const errors: ValidationError[] = []
			const now = new Date()

			if (startDate <= now) {
				errors.push({
					field: 'startDate',
					message: 'Lease start date must be in the future'
				})
			}

			if (endDate <= startDate) {
				errors.push({
					field: 'endDate',
					message: 'Lease end date must be after start date'
				})
			}

			const maxLeaseLength = 5 * 365 * 24 * 60 * 60 * 1000 // 5 years in ms
			if (endDate.getTime() - startDate.getTime() > maxLeaseLength) {
				errors.push({
					field: 'endDate',
					message: 'Lease duration cannot exceed 5 years'
				})
			}

			return {
				isValid: errors.length === 0,
				errors
			}
		},

		/**
		 * Validates rent amount constraints
		 */
		rentAmount: (amount: number): ValidationResult => {
			const errors: ValidationError[] = []

			if (amount <= 0) {
				errors.push({
					field: 'rentAmount',
					message: 'Rent amount must be greater than 0'
				})
			}

			if (amount > 100000) {
				errors.push({
					field: 'rentAmount',
					message: 'Rent amount cannot exceed $100,000'
				})
			}

			return {
				isValid: errors.length === 0,
				errors
			}
		}
	}

	/**
	 * Validate using Zod schemas with better error messages
	 */
	validateWithZod<T>(
		schema: z.ZodSchema<T>,
		data: unknown,
		fieldName = 'field'
	): ValidationResult {
		try {
			schema.parse(data)
			return { isValid: true, errors: [] }
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors: ValidationError[] = error.issues.map((err: z.ZodIssue) => ({
					field: err.path.join('.') || fieldName,
					message: err.message,
					value: data
				}))
				return { isValid: false, errors }
			}
			
			return {
				isValid: false,
				errors: [{
					field: fieldName,
					message: 'Validation failed',
					value: data
				}]
			}
		}
	}

	/**
	 * Quick validation methods using Zod schemas
	 */
	validateEmailZod(email: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.email, email, 'email')
	}

	validatePasswordZod(password: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.password, password, 'password')
	}

	validateUUIDZod(uuid: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.uuid, uuid, 'uuid')
	}

	validateURLZod(url: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.url, url, 'url')
	}

	validatePriorityZod(priority: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.priority, priority, 'priority')
	}

	validateUserRoleZod(role: string): ValidationResult {
		return this.validateWithZod(ValidationService.ZOD_SCHEMAS.userRole, role, 'role')
	}

	/**
	 * Get Zod schemas for external use
	 */
	getZodSchemas() {
		return ValidationService.ZOD_SCHEMAS
	}
}