/**
 * Shared JSON Schema Definitions
 *
 * Common validation patterns used across all schemas
 * Single source of truth for validation rules
 */

import type { JSONSchema } from '../shared/types/express-type-provider'

// UUID validation
export const uuidSchema: JSONSchema = {
	type: 'string',
	format: 'uuid'
}

// Email validation
export const emailSchema: JSONSchema = {
	type: 'string',
	format: 'email',
	minLength: 1,
	maxLength: 255
}

// Phone validation
export const phoneSchema: JSONSchema = {
	type: 'string',
	pattern: '^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$'
}

// Date validation
export const dateSchema: JSONSchema = {
	type: 'string',
	format: 'date'
}

// DateTime validation
export const dateTimeSchema: JSONSchema = {
	type: 'string',
	format: 'date-time'
}

// Money validation (cents)
export const moneySchema: JSONSchema = {
	type: 'integer',
	minimum: 0,
	maximum: 999999999
}

// Percentage validation
export const percentageSchema: JSONSchema = {
	type: 'number',
	minimum: 0,
	maximum: 100
}

// Pagination query schema
export const paginationSchema: JSONSchema = {
	type: 'object',
	properties: {
		limit: {
			type: 'integer',
			minimum: 1,
			maximum: 100,
			default: 10
		},
		offset: {
			type: 'integer',
			minimum: 0,
			default: 0
		},
		sortBy: {
			type: 'string'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}

// Standard success response
export const successResponseSchema: JSONSchema = {
	type: 'object',
	required: ['success', 'message'],
	properties: {
		success: {
			type: 'boolean',
			enum: [true]
		},
		message: {
			type: 'string'
		},
		data: {
			type: 'object',
			additionalProperties: true
		}
	}
}

// Standard error response
export const errorResponseSchema: JSONSchema = {
	type: 'object',
	required: ['statusCode', 'error', 'message'],
	properties: {
		statusCode: {
			type: 'integer',
			minimum: 400,
			maximum: 599
		},
		error: {
			type: 'string'
		},
		message: {
			type: 'string'
		}
	}
}

// Common HTTP response schemas
export const httpResponseSchemas = {
	400: errorResponseSchema,
	401: errorResponseSchema,
	403: errorResponseSchema,
	404: errorResponseSchema,
	409: errorResponseSchema,
	422: errorResponseSchema,
	429: errorResponseSchema,
	500: errorResponseSchema
}

// Export as const for better TypeScript inference
export const sharedSchemas = {
	uuid: uuidSchema,
	email: emailSchema,
	phone: phoneSchema,
	date: dateSchema,
	dateTime: dateTimeSchema,
	money: moneySchema,
	percentage: percentageSchema,
	pagination: paginationSchema,
	successResponse: successResponseSchema,
	errorResponse: errorResponseSchema,
	httpResponses: httpResponseSchemas
} as const
