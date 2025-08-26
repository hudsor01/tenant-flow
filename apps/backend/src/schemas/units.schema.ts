/**
 * Units JSON Schema Definitions
 *
 * Ultra-native Fastify JSON Schema validation
 * Single source of truth - no duplication
 * Automatic TypeScript type inference
 * 5-10x faster than class-validator
 */

import type { JSONSchema } from '../shared/types/fastify-type-provider'

// Shared validation patterns
const uuidSchema: JSONSchema = {
	type: 'string',
	format: 'uuid'
}

const unitStatusSchema: JSONSchema = {
	type: 'string',
	enum: ['VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED']
}

/**
 * Create unit request schema
 */
export interface CreateUnitRequest {
	propertyId: string
	unitNumber: string
	bedrooms: number
	bathrooms: number
	squareFeet?: number
	rent: number
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export const createUnitSchema: JSONSchema = {
	type: 'object',
	required: ['propertyId', 'unitNumber', 'bedrooms', 'bathrooms', 'rent'],
	additionalProperties: false,
	properties: {
		propertyId: uuidSchema,
		unitNumber: {
			type: 'string',
			minLength: 1,
			maxLength: 20
		},
		bedrooms: {
			type: 'integer',
			minimum: 0,
			maximum: 20
		},
		bathrooms: {
			type: 'number',
			minimum: 0,
			maximum: 10
		},
		squareFeet: {
			type: 'integer',
			minimum: 1,
			maximum: 50000
		},
		rent: {
			type: 'number',
			minimum: 0,
			maximum: 100000
		},
		status: unitStatusSchema
	}
}

/**
 * Update unit request schema
 */
export interface UpdateUnitRequest {
	unitNumber?: string
	bedrooms?: number
	bathrooms?: number
	squareFeet?: number
	rent?: number
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
}

export const updateUnitSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		unitNumber: {
			type: 'string',
			minLength: 1,
			maxLength: 20
		},
		bedrooms: {
			type: 'integer',
			minimum: 0,
			maximum: 20
		},
		bathrooms: {
			type: 'number',
			minimum: 0,
			maximum: 10
		},
		squareFeet: {
			type: 'integer',
			minimum: 1,
			maximum: 50000
		},
		rent: {
			type: 'number',
			minimum: 0,
			maximum: 100000
		},
		status: unitStatusSchema
	}
}

/**
 * Unit query schema
 */
export interface UnitQueryRequest {
	propertyId?: string
	status?: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED'
	search?: string
	bedroomsMin?: number
	bedroomsMax?: number
	rentMin?: number
	rentMax?: number
	limit?: number
	offset?: number
	sortBy?: 'createdAt' | 'unitNumber' | 'bedrooms' | 'rent' | 'status'
	sortOrder?: 'asc' | 'desc'
}

export const unitQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		propertyId: uuidSchema,
		status: unitStatusSchema,
		search: {
			type: 'string'
		},
		bedroomsMin: {
			type: 'integer',
			minimum: 0,
			maximum: 20
		},
		bedroomsMax: {
			type: 'integer',
			minimum: 0,
			maximum: 20
		},
		rentMin: {
			type: 'number',
			minimum: 0,
			maximum: 100000
		},
		rentMax: {
			type: 'number',
			minimum: 0,
			maximum: 100000
		},
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
			enum: ['createdAt', 'unitNumber', 'bedrooms', 'rent', 'status'],
			default: 'createdAt'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}

// Route schemas for Fastify validation
export const unitRouteSchemas = {
	create: {
		body: createUnitSchema,
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
		body: updateUnitSchema,
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
		querystring: unitQuerySchema,
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						propertyId: { type: 'string' },
						unitNumber: { type: 'string' },
						bedrooms: { type: 'number' },
						bathrooms: { type: 'number' },
						squareFeet: { type: 'number' },
						rent: { type: 'number' },
						status: unitStatusSchema,
						createdAt: { type: 'string' },
						updatedAt: { type: 'string' }
					}
				}
			}
		}
	}
} as const
