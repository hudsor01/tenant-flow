import { z } from 'zod'

/**
 * Common validation schemas used across the application
 * Ensures consistent validation rules and error messages
 */

// Basic field validations
export const commonValidations = {
	// Personal information
	name: z.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters')
		.trim(),
	
	firstName: z.string()
		.min(1, 'First name is required')
		.max(50, 'First name must be less than 50 characters')
		.trim(),
	
	lastName: z.string()
		.min(1, 'Last name is required')
		.max(50, 'Last name must be less than 50 characters')
		.trim(),
	
	email: z.string()
		.email('Please enter a valid email address')
		.max(255, 'Email must be less than 255 characters')
		.toLowerCase(),
	
	phone: z.string()
		.regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
		.optional()
		.or(z.literal('')),
	
	// Address fields
	address: z.string()
		.min(1, 'Address is required')
		.max(255, 'Address must be less than 255 characters')
		.trim(),
	
	city: z.string()
		.min(1, 'City is required')
		.max(100, 'City must be less than 100 characters')
		.trim(),
	
	state: z.string()
		.min(2, 'State is required')
		.max(50, 'State must be less than 50 characters')
		.trim(),
	
	zipCode: z.string()
		.regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code')
		.trim(),
	
	// Financial fields
	amount: z.number()
		.min(0, 'Amount must be positive')
		.max(999999.99, 'Amount is too large'),
	
	rent: z.number()
		.min(0, 'Rent must be positive')
		.max(99999.99, 'Rent amount is too large'),
	
	// Property fields
	propertyName: z.string()
		.min(1, 'Property name is required')
		.max(100, 'Property name must be less than 100 characters')
		.trim(),
	
	unitNumber: z.string()
		.min(1, 'Unit number is required')
		.max(20, 'Unit number must be less than 20 characters')
		.trim(),
	
	// Dates
	date: z.string()
		.min(1, 'Date is required')
		.refine((date) => !isNaN(Date.parse(date)), 'Please enter a valid date'),
	
	futureDate: z.string()
		.min(1, 'Date is required')
		.refine((date) => !isNaN(Date.parse(date)), 'Please enter a valid date')
		.refine((date) => new Date(date) > new Date(), 'Date must be in the future'),
	
	// Text fields
	title: z.string()
		.min(1, 'Title is required')
		.max(200, 'Title must be less than 200 characters')
		.trim(),
	
	description: z.string()
		.max(1000, 'Description must be less than 1000 characters')
		.trim()
		.optional(),
	
	notes: z.string()
		.max(2000, 'Notes must be less than 2000 characters')
		.trim()
		.optional(),
	
	// Files
	file: z.any()
		.refine((file) => file?.size <= 10 * 1024 * 1024, 'File must be less than 10MB')
		.refine((file) => file?.type?.startsWith('image/'), 'Only image files are allowed')
		.optional(),
	
	avatar: z.any()
		.refine((file) => file?.size <= 5 * 1024 * 1024, 'Avatar must be less than 5MB')
		.refine((file) => ['image/jpeg', 'image/png', 'image/gif'].includes(file?.type), 'Avatar must be JPG, PNG, or GIF')
		.optional()
}

// Common composite schemas
export const addressSchema = z.object({
	address: commonValidations.address,
	city: commonValidations.city,
	state: commonValidations.state,
	zipCode: commonValidations.zipCode
})

export const nameSchema = z.object({
	firstName: commonValidations.firstName,
	lastName: commonValidations.lastName
})

export const contactSchema = z.object({
	email: commonValidations.email,
	phone: commonValidations.phone
})

// Utility function to create optional versions of schemas
export function makeOptional<T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> {
	return schema.optional()
}

// Utility function to create arrays of schemas
export function makeArray<T extends z.ZodTypeAny>(schema: T): z.ZodArray<T> {
	return z.array(schema)
}

// Common enums for validation
export const enums = {
	priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
	leaseStatus: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED', 'PENDING']),
	userRole: z.enum(['ADMIN', 'PROPERTY_MANAGER', 'TENANT', 'OWNER']),
	maintenanceStatus: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
	paymentStatus: z.enum(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'])
}