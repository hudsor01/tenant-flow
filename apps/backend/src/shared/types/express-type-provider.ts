/**
 * Type provider utilities for Express JSON Schema validation
 */

export interface TypeProvider {
	output: unknown
	input: unknown
}

export interface ExpressTypeProvider extends TypeProvider {
	serializer: {
		fromArray: (array: unknown[]) => unknown
		fromObject: (object: Record<string, unknown>) => unknown
	}
	validator: {
		isValid: (schema: unknown, data: unknown) => boolean
	}
}

export const defaultTypeProvider: ExpressTypeProvider = {
	output: {},
	input: {},
	serializer: {
		fromArray: (array: unknown[]) => array,
		fromObject: (object: Record<string, unknown>) => object
	},
	validator: {
		isValid: () => true
	}
}

// JSON Schema Draft 7 interface for TypeScript typing
export interface JSONSchema {
	type?: string | string[]
	properties?: Record<string, JSONSchema>
	required?: string[]
	additionalProperties?: boolean | JSONSchema
	items?: JSONSchema | JSONSchema[]
	enum?: unknown[]
	const?: unknown
	anyOf?: JSONSchema[]
	oneOf?: JSONSchema[]
	allOf?: JSONSchema[]
	not?: JSONSchema
	format?: string
	pattern?: string
	minLength?: number
	maxLength?: number
	minimum?: number
	maximum?: number
	minItems?: number
	maxItems?: number
	maxProperties?: number
	minProperties?: number
	uniqueItems?: boolean
	multipleOf?: number
	exclusiveMinimum?: number
	exclusiveMaximum?: number
	default?: unknown
	description?: string
	title?: string
	$id?: string
	$ref?: string
	$schema?: string
	definitions?: Record<string, JSONSchema>
	if?: JSONSchema
	then?: JSONSchema
	else?: JSONSchema
}
