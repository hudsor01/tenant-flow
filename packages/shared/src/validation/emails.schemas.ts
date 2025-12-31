/**
 * Email Header Injection Prevention Schemas
 * Prevents CRLF injection and validates email headers
 *
 * Zod 4 Best Practices:
 * - Use top-level validators: z.email(), z.uuid(), z.url()
 */

import { z } from 'zod'

// Regular expressions for email header validation
const CRLF_REGEX = /[\r\n]/g
const HEADER_INJECTION_REGEX = /[\r\n]\s*[a-zA-Z-]+:/g // Detects potential header injection

/**
 * Validates and sanitizes email addresses to prevent header injection
 */
export const SecureEmailSchema = z
	.email({ message: 'Invalid email format' })
	.refine(
		email => !CRLF_REGEX.test(email),
		'Email cannot contain line breaks or control characters'
	)
	.refine(
		email => !HEADER_INJECTION_REGEX.test(email),
		'Email contains invalid header patterns'
	)
	.transform(email => email.trim().toLowerCase())

/**
 * Validates email metadata to prevent header injection
 */
export const EmailMetadataSchema = z.object({
	email: SecureEmailSchema,
	first_name: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name is too long')
		.refine(
			name => !CRLF_REGEX.test(name),
			'Name cannot contain line breaks or control characters'
		)
		.transform(name => name.trim()),
	last_name: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name is too long')
		.refine(
			name => !CRLF_REGEX.test(name),
			'Name cannot contain line breaks or control characters'
		)
		.transform(name => name.trim()),
	property_id: z.uuid({ message: 'Property ID must be a valid UUID' }).optional(),
	lease_id: z.uuid({ message: 'Lease ID must be a valid UUID' }).optional(),
	unit_id: z.uuid({ message: 'Unit ID must be a valid UUID' }).optional(),
	propertyName: z
		.string()
		.max(200, 'Property name is too long')
		.refine(
			name => !CRLF_REGEX.test(name),
			'Property name cannot contain line breaks or control characters'
		)
		.transform(name => name.trim())
		.optional(),
	unit_number: z
		.string()
		.max(50, 'Unit number is too long')
		.refine(
			number => !CRLF_REGEX.test(number),
			'Unit number cannot contain line breaks or control characters'
		)
		.transform(number => number.trim())
		.optional(),
	checkoutUrl: z.url({ message: 'Checkout URL must be a valid URL' }).optional(),
	user_type: z.enum(['TENANT', 'OWNER', 'ADMIN']).default('TENANT')
})

/**
 * Validates tenant invitation data to prevent header injection
 */
export const TenantInvitationDataSchema = z.object({
	email: SecureEmailSchema,
	first_name: z
		.string()
		.min(1, 'First name is required')
		.max(100, 'First name is too long')
		.refine(
			name => !CRLF_REGEX.test(name),
			'First name cannot contain line breaks or control characters'
		)
		.transform(name => name.trim()),
	last_name: z
		.string()
		.min(1, 'Last name is required')
		.max(100, 'Last name is too long')
		.refine(
			name => !CRLF_REGEX.test(name),
			'Last name cannot contain line breaks or control characters'
		)
		.transform(name => name.trim()),
	phone: z
		.string()
		.max(20, 'Phone number is too long')
		.refine(
			phone => !CRLF_REGEX.test(phone),
			'Phone number cannot contain line breaks or control characters'
		)
		.transform(phone => phone?.trim())
		.optional()
		.nullable()
})

/**
 * Validates email headers to prevent injection attacks
 */
export const EmailHeadersSchema = z.object({
	from: z
		.email({ message: 'From address must be valid' })
		.refine(
			email => !CRLF_REGEX.test(email),
			'From email cannot contain line breaks or control characters'
		),
	to: z
		.email({ message: 'To address must be valid' })
		.refine(
			email => !CRLF_REGEX.test(email),
			'To email cannot contain line breaks or control characters'
		),
	subject: z
		.string()
		.max(500, 'Subject is too long')
		.refine(
			subject => !CRLF_REGEX.test(subject),
			'Subject cannot contain line breaks or control characters'
		)
		.transform(subject => subject.trim()),
	replyTo: z
		.email({ message: 'Reply-to address must be valid' })
		.refine(
			email => !CRLF_REGEX.test(email),
			'Reply-to email cannot contain line breaks or control characters'
		)
		.optional()
})
