import { z } from 'zod'
import { UNIT_STATUS, PROPERTY_TYPE, PRIORITY as MAINTENANCE_PRIORITY, MAINTENANCE_CATEGORY } from '@repo/shared'

// Common field validation schemas to reduce duplication across the codebase
export const commonValidations = {
	// Basic text fields
	requiredString: (fieldName: string) =>
		z.string().min(1, `${fieldName} is required`),

	optionalString: z.string().optional(),

	name: z
		.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters'),

	title: z
		.string()
		.min(1, 'Title is required')
		.max(100, 'Title must be less than 100 characters'),

	description: z
		.string()
		.min(10, 'Please provide a detailed description')
		.max(1000, 'Description must be less than 1000 characters'),

	// Contact information
	email: z
		.string()
		.min(1, 'Email is required')
		.email('Please enter a valid email address'),

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
	propertyType: z.enum(Object.values(PROPERTY_TYPE) as [string, ...string[]]),
	unitNumber: z
		.string()
		.min(1, 'Unit number is required')
		.max(20, 'Unit number must be less than 20 characters'),
	bedrooms: z.number().min(0).max(10),
	bathrooms: z.number().min(0).max(10),
	squareFeet: z.number().min(100).max(10000).optional(),
	rent: z.number().min(0).max(100000),

	// Status enums
	unitStatus: z.enum(Object.values(UNIT_STATUS) as [string, ...string[]]),
	maintenancePriority: z.enum(
		Object.values(MAINTENANCE_PRIORITY) as [string, ...string[]]
	),
	maintenanceCategory: z.enum(
		Object.values(MAINTENANCE_CATEGORY) as [string, ...string[]]
	),

	// Date fields
	date: z.date(),
	optionalDate: z.date().optional(),

	// File upload
	file: z.instanceof(File).optional()
}

// Common schema patterns for forms
export const createFormSchema = <T extends z.ZodRawShape>(shape: T) =>
	z.object(shape)

// Property form schema
export const propertyFormSchema = createFormSchema({
	name: commonValidations.name,
	description: commonValidations.description,
	address: commonValidations.address,
	city: commonValidations.city,
	state: commonValidations.state,
	zipCode: commonValidations.zipCode,
	propertyType: commonValidations.propertyType,
	numberOfUnits: commonValidations.positiveNumber
})

// Unit form schema
export const unitFormSchema = createFormSchema({
	unitNumber: commonValidations.unitNumber,
	propertyId: commonValidations.requiredString('Property ID'),
	bedrooms: commonValidations.bedrooms,
	bathrooms: commonValidations.bathrooms,
	squareFeet: commonValidations.squareFeet,
	rent: commonValidations.rent,
	status: commonValidations.unitStatus
})

// Maintenance request schema
export const maintenanceRequestSchema = createFormSchema({
	unitId: commonValidations.requiredString('Unit'),
	title: commonValidations.title,
	description: commonValidations.description,
	category: commonValidations.maintenanceCategory,
	priority: commonValidations.maintenancePriority
})

// Tenant form schema
export const tenantFormSchema = createFormSchema({
	name: commonValidations.name,
	email: commonValidations.email,
	phone: commonValidations.phone,
	emergencyContactName: commonValidations.name,
	emergencyContactPhone: commonValidations.phone
})

// Payment form schema
export const paymentFormSchema = createFormSchema({
	amount: commonValidations.currency,
	dueDate: commonValidations.date,
	description: commonValidations.description
})
