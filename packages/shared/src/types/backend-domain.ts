/**
 * BACKEND DOMAIN TYPES
 *
 * JSON Schema types for validation
 */

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
