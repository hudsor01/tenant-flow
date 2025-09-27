/**
 * Type provider utilities for Express JSON Schema validation
 * Moved large interfaces to @repo/shared for centralization
 */

import type {
	TypeProvider,
	ExpressTypeProvider,
	JSONSchema
} from '@repo/shared'

// Re-export for backward compatibility
export type { TypeProvider, ExpressTypeProvider, JSONSchema }

export const defaultTypeProvider: ExpressTypeProvider = {
	output: {},
	input: {},
	serializer: {
		fromArray: (array: unknown[]) => array,
		fromObject: (object: Record<string, unknown>) => object
	}
}
