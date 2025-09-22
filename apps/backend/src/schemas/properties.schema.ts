/**
 * Properties JSON Schema Definitions
 *
 * Express JSON Schema validation
 * Single source of truth - no duplication
 */

import type { JSONSchema } from '../shared/types/express-type-provider'

// Shared validation patterns
const uuidSchema: JSONSchema = {
	type: 'string',
	format: 'uuid'
}

const propertyTypeSchema: JSONSchema = {
	type: 'string',
	enum: ['SINGLE_FAMILY', 'MULTI_UNIT', 'APARTMENT', 'COMMERCIAL'],
	default: 'SINGLE_FAMILY'
}

/**
 * Create property request schema
 */
export const createPropertySchema: JSONSchema = {
	type: 'object',
	required: ['name', 'address', 'city', 'state', 'zipCode'],
	additionalProperties: false,
	properties: {
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		address: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		city: {
			type: 'string',
			minLength: 1,
			maxLength: 100
		},
		state: {
			type: 'string',
			minLength: 2,
			maxLength: 50
		},
		zipCode: {
			type: 'string',
			pattern: '^[0-9]{5}(-[0-9]{4})?$'
		},
		description: {
			type: 'string',
			maxLength: 1000
		},
		imageUrl: {
			type: 'string',
			format: 'uri'
		},
		propertyType: propertyTypeSchema,
		unit_number: {
			type: 'string',
			maxLength: 20
		}
	}
}

/**
 * Update property request schema
 */
export const updatePropertySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		address: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		city: {
			type: 'string',
			minLength: 1,
			maxLength: 100
		},
		state: {
			type: 'string',
			minLength: 2,
			maxLength: 50
		},
		zipCode: {
			type: 'string',
			pattern: '^[0-9]{5}(-[0-9]{4})?$'
		},
		description: {
			type: 'string',
			maxLength: 1000
		},
		imageUrl: {
			type: 'string',
			format: 'uri'
		},
		propertyType: propertyTypeSchema,
		unit_number: {
			type: 'string',
			maxLength: 20
		}
	}
}

/**
 * Property query schema
 */
export const propertyQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		search: {
			type: 'string'
		},
		city: {
			type: 'string'
		},
		state: {
			type: 'string'
		},
		propertyType: propertyTypeSchema,
		limit: {
			type: 'integer',
			minimum: 1,
			maximum: 50,
			default: 10
		},
		offset: {
			type: 'integer',
			minimum: 0,
			default: 0
		},
		sortBy: {
			type: 'string',
			enum: ['name', 'address', 'city', 'createdAt'],
			default: 'createdAt'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}

// Route schemas for Express validation
export const propertyRouteSchemas = {
	create: {
		body: createPropertySchema,
		response: {
			201: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	update: {
		params: {
			type: 'object',
			required: ['id'],
			properties: {
				id: uuidSchema
			}
		},
		body: updatePropertySchema,
		response: {
			200: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					message: { type: 'string' }
				}
			}
		}
	},
	findAll: {
		querystring: propertyQuerySchema,
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						ownerId: { type: 'string' },
						name: { type: 'string' },
						address: { type: 'string' },
						city: { type: 'string' },
						state: { type: 'string' },
						zipCode: { type: 'string' },
						propertyType: propertyTypeSchema,
						description: { type: 'string' },
						imageUrl: { type: 'string' },
						createdAt: { type: 'string' },
						updatedAt: { type: 'string' }
					}
				}
			}
		}
	}
} as const
