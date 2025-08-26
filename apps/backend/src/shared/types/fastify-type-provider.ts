/**
 * Type provider utilities for Fastify schema validation
 */

export interface TypeProvider {
<<<<<<< HEAD
	output: unknown
	input: unknown
}

export interface FastifyTypeProvider extends TypeProvider {
	serializer: {
		fromArray: (array: unknown[]) => unknown
		fromObject: (object: Record<string, unknown>) => unknown
	}
	validator: {
		isValid: (schema: unknown, data: unknown) => boolean
	}
}

export const defaultTypeProvider: FastifyTypeProvider = {
	output: {},
	input: {},
	serializer: {
		fromArray: (array: unknown[]) => array,
		fromObject: (object: Record<string, unknown>) => object
	},
	validator: {
		isValid: () => true // Minimal implementation
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
=======
  output: unknown
  input: unknown
}

export interface FastifyTypeProvider extends TypeProvider {
  serializer: {
    fromArray: (array: unknown[]) => unknown
    fromObject: (object: Record<string, unknown>) => unknown
  }
  validator: {
    isValid: (schema: unknown, data: unknown) => boolean
  }
}

export const defaultTypeProvider: FastifyTypeProvider = {
  output: {},
  input: {},
  serializer: {
    fromArray: (array: unknown[]) => array,
    fromObject: (object: Record<string, unknown>) => object
  },
  validator: {
    isValid: () => true // Minimal implementation
  }
}

// Schema utilities
export interface TypedJSONSchema {
  type: string
  properties?: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
}

export function createTypedSchema(schema: TypedJSONSchema): TypedJSONSchema {
  return schema
}

export const schemaRegistry = new Map<string, TypedJSONSchema>()
>>>>>>> origin/main
