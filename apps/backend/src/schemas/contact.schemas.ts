/**
 * Contact Form Schemas
 *
 * JSON Schema definitions for contact form endpoints.
 * Replaces class-validator DTOs with type-safe schema definitions.
 */

import type { JSONSchema } from '../shared/types/fastify-type-provider'

/**
 * Contact form submission request
 */
export interface ContactFormRequest {
	name: string
	email: string
	subject: string
	message: string
	type: 'sales' | 'support' | 'general'
}

export const contactFormSchema: JSONSchema = {
	type: 'object',
	required: ['name', 'email', 'subject', 'message', 'type'],
	additionalProperties: false,
	properties: {
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 100,
			pattern: '^[a-zA-Z\\s\\-\']+$',
			description: 'Full name of the person submitting the form'
		},
		email: {
			type: 'string',
			format: 'email',
			maxLength: 254,
			description: 'Valid email address for contact response'
		},
		subject: {
			type: 'string',
			minLength: 1,
			maxLength: 200,
			description: 'Subject line for the contact message'
		},
		message: {
			type: 'string',
			minLength: 10,
			maxLength: 5000,
			description: 'Detailed message content'
		},
		type: {
			type: 'string',
			enum: ['sales', 'support', 'general'],
			description: 'Category of the contact inquiry'
		}
	}
}

/**
 * Contact form response
 */
export interface ContactFormResponse {
	message: string
}

export const contactFormResponseSchema: JSONSchema = {
	type: 'object',
	required: ['message'],
	properties: {
		message: {
			type: 'string',
			description: 'Confirmation message for successful submission'
		}
	}
}

// Export route schemas for controller usage
export const contactRouteSchemas = {
	submitForm: {
		body: contactFormSchema,
		response: {
			200: contactFormResponseSchema,
			400: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			},
			500: {
				type: 'object',
				properties: {
					statusCode: { type: 'number' },
					error: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	}
} as const