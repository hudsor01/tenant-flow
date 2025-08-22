/**
 * Type provider utilities for Fastify schema validation
 */

export interface TypeProvider {
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