/**
 * Type provider utilities for Express JSON Schema validation
 * Moved large interfaces to @repo/shared for centralization
 */

import type {
	ExpressTypeProvider,
	JSONSchema
} from '@repo/shared/types/api-contracts'

export type { JSONSchema }

export const defaultTypeProvider: ExpressTypeProvider = {
	output: {},
	input: {},
	serializer: {
		fromArray: (array: unknown[]) => array,
		fromObject: (object: Record<string, unknown>) => object
	}
}
