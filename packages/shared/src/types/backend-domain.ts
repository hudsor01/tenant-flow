/**
 * BACKEND DOMAIN TYPES
 *
 * Types for Express type providers and JSON Schema validation
 */

export interface TypeProvider {
	output: Record<string, unknown>
	input: Record<string, unknown>
}

export interface ExpressTypeProvider extends TypeProvider {
	output: Record<string, unknown>
	input: Record<string, unknown>
	serializer?: {
		fromArray: (array: unknown[]) => unknown
		fromObject: (object: Record<string, unknown>) => unknown
	}
}

export interface JSONSchema {
	type?: string | string[]
	properties?: Record<string, JSONSchema>
	required?: string[]
	additionalProperties?: boolean | JSONSchema
	items?: JSONSchema
	enum?: unknown[]
	format?: string
	pattern?: string
	minimum?: number
	maximum?: number
	minLength?: number
	maxLength?: number
	description?: string
	oneOf?: JSONSchema[]
	anyOf?: JSONSchema[]
	allOf?: JSONSchema[]
	$ref?: string
	examples?: unknown[]
	default?: unknown
}
