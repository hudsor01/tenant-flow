/**
 * Form validation schemas using Zod with security enhancements
 * Integrated with security input sanitization system
 */
import { z } from 'zod'
import { Security } from '../security'

// Re-export shared validation schemas to avoid duplication
export {
	propertyInputSchema as propertySchema,
	tenantInputSchema as tenantSchema,
	leaseInputSchema as leaseSchema,
	maintenanceRequestInputSchema as maintenanceSchema,
	unitInputSchema as unitSchema
} from '@repo/shared/validation'

// Common field validation schemas to reduce duplication across the codebase
export const commonValidations = {
	// Basic text fields
	requiredString: (fieldName: string) =>
		z.string().min(1, `${fieldName} is required`),

	optionalString: z.string().optional(),

	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters')
		.transform(val => val.trim())
		.refine(val => {
			// Allow letters, spaces, hyphens, apostrophes, and numbers (for suffixes like Jr., III, 2nd)
			// This covers most real-world names including multi-part names
			const nameRegex = /^[a-zA-Z0-9\s'-.\s]+$/
			return nameRegex.test(val)
		}, 'Name can only contain letters, numbers, spaces, hyphens, periods, and apostrophes'),

	title: z
		.string()
		.min(1, 'Title is required')
		.max(100, 'Title must be less than 100 characters'),

	description: z
		.string()
		.min(10, 'Please provide a detailed description')
		.max(1000, 'Description must be less than 1000 characters')
		.transform(val => Security.sanitizeInput(val).sanitized || val)
		.refine(val => {
			const validation = Security.sanitizeInput(val)
			return validation.valid
		}, 'Description contains invalid or potentially dangerous content'),

	// Contact information
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address')
		.transform(val => val.toLowerCase().trim())
		.refine(val => {
			const validation = Security.validateEmail(val)
			return validation.valid
		}, 'Email contains invalid characters'),

	phone: z
		.string()
		.min(1, 'Phone number is required')
		.regex(/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'),

	// Address fields
	address: z.string().min(1, 'Address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z
		.string()
		.min(1, 'ZIP code is required')
		.regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code'),

	// Numeric fields
	positiveNumber: z.number().min(0, 'Must be a positive number'),
	currency: z.number().min(0, 'Amount must be positive'),
	percentage: z
		.number()
		.min(0)
		.max(100, 'Percentage must be between 0 and 100'),

	// Property-specific fields
	propertyType: z.enum([
		'SINGLE_FAMILY',
		'MULTI_FAMILY',
		'APARTMENT',
		'COMMERCIAL',
		'OTHER'
	]),
	unitNumber: z
		.string()
		.min(1, 'Unit number is required')
		.max(20, 'Unit number must be less than 20 characters'),
	bedrooms: z.number().min(0).max(10),
	bathrooms: z.number().min(0).max(10),
	squareFeet: z.number().min(100).max(10000).optional(),
	rent: z.number().min(0).max(100000),

	// Status enums
	unitStatus: z.enum(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE']),
	maintenancePriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	maintenanceCategory: z.enum([
		'PLUMBING',
		'ELECTRICAL',
		'HVAC',
		'APPLIANCE',
		'GENERAL',
		'EMERGENCY'
	]),

	// Date fields
	date: z.date(),
	optionalDate: z.date().optional(),

	// File upload with basic validation (removed security dependency)
	file: z
		.instanceof(File)
		.optional()
		.refine(file => {
			if (!file) return true
			// Basic security checks using native File API
			const maxSize = 10 * 1024 * 1024 // 10MB
			const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
			return file.size <= maxSize && allowedTypes.includes(file.type)
		}, 'File must be under 10MB and be a valid image, PDF, or text file')
}

// Common schema patterns for forms
export const createFormSchema = <T extends z.ZodRawShape>(shape: T) =>
	z.object(shape)

// Re-export shared form schemas and add frontend-specific ones
export {
	propertyFormSchema,
	unitFormSchema,
	maintenanceRequestInputSchema as maintenanceRequestSchema,
	tenantFormSchema,
	leaseInputSchema as leaseFormSchema
} from '@repo/shared/validation'

// Frontend-specific form schemas
export const paymentFormSchema = createFormSchema({
	amount: commonValidations.currency,
	dueDate: commonValidations.date,
	description: commonValidations.description
})

// Auth schemas
export const loginSchema = createFormSchema({
	email: commonValidations.email,
	password: z.string().min(1, 'Password is required')
})

export const signupSchema = createFormSchema({
	email: commonValidations.email,
	password: z.string().min(8, 'Password must be at least 8 characters'),
	confirmPassword: z.string().min(1, 'Please confirm your password'),
	firstName: commonValidations.name,
	lastName: commonValidations.name
}).refine(data => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword']
})

// Profile update schema
export const profileUpdateSchema = createFormSchema({
	name: commonValidations.name,
	email: commonValidations.email,
	phone: commonValidations.phone.optional(),
	company: z.string().max(100, 'Company name must be less than 100 characters').optional(),
	bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
	address: commonValidations.address.optional(),
	city: commonValidations.city.optional(),
	state: commonValidations.state.optional(),
	zipCode: commonValidations.zipCode.optional()
})

// Type exports for use in components - re-export shared types and add frontend-specific ones
export type {
	PropertyFormData,
	TenantFormData,
	LeaseFormData,
	UnitFormData,
	MaintenanceRequestData
} from '@repo/shared/validation'

export type PaymentFormData = z.infer<typeof paymentFormSchema>
export type LoginData = z.infer<typeof loginSchema>
export type SignupData = z.infer<typeof signupSchema>
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>
