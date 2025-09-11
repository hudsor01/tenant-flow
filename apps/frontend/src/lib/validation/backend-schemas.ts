/**
 * Frontend Zod Schemas matching Backend JSON Schemas
 * 
 * These schemas mirror the backend JSON schemas for client-side validation
 * Manually maintained to ensure consistency with backend validation
 */

import { z } from 'zod'

// Contact Form Schemas
export const contactFormZodSchema = z.object({
	name: z.string()
		.min(1, 'Name is required')
		.max(100, 'Name must be less than 100 characters')
		.regex(/^[a-zA-Z\s\-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
	email: z.string()
		.email('Please enter a valid email address')
		.max(254, 'Email must be less than 254 characters'),
	subject: z.string()
		.min(1, 'Subject is required')
		.max(200, 'Subject must be less than 200 characters'),
	message: z.string()
		.min(10, 'Message must be at least 10 characters')
		.max(5000, 'Message must be less than 5000 characters'),
	type: z.enum(['sales', 'support', 'general'], {
		message: 'Please select a contact type'
	})
})

export const contactFormResponseZodSchema = z.object({
	message: z.string()
})

// Auth Schemas (basic examples - extend based on your auth.schemas.ts)
export const loginZodSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
})

export const registerZodSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string()
		.min(8, 'Password must be at least 8 characters')
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
	confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword']
})

// Property Schemas (basic examples - extend based on your property.schemas.ts)
export const propertyZodSchema = z.object({
	name: z.string().min(1, 'Property name is required'),
	address: z.string().min(1, 'Address is required'),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
	type: z.enum(['single_family', 'multi_family', 'apartment', 'condo', 'commercial']),
	units: z.number().int().min(1, 'Must have at least 1 unit')
})

// Type exports for TypeScript
export type ContactFormData = z.infer<typeof contactFormZodSchema>
export type ContactFormResponse = z.infer<typeof contactFormResponseZodSchema>
export type LoginData = z.infer<typeof loginZodSchema>
export type RegisterData = z.infer<typeof registerZodSchema>
export type PropertyData = z.infer<typeof propertyZodSchema>

// Export all schemas for easy import
export const backendSchemas = {
	contactForm: contactFormZodSchema,
	contactFormResponse: contactFormResponseZodSchema,
	login: loginZodSchema,
	register: registerZodSchema,
	property: propertyZodSchema
} as const