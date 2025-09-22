/**
 * Tenants JSON Schema Definitions
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

const emailSchema: JSONSchema = {
	type: 'string',
	format: 'email',
	maxLength: 255
}

const phoneSchema: JSONSchema = {
	type: 'string',
	pattern: '^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$'
}

const invitationStatusSchema: JSONSchema = {
	type: 'string',
	enum: ['PENDING', 'SENT', 'ACCEPTED', 'EXPIRED']
}

/**
 * Create tenant request schema
 */
export interface CreateTenantRequest {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
}

export const createTenantSchema: JSONSchema = {
	type: 'object',
	required: ['name', 'email'],
	additionalProperties: false,
	properties: {
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		email: emailSchema,
		phone: phoneSchema,
		emergencyContact: {
			type: 'string',
			maxLength: 500
		}
	}
}

/**
 * Update tenant request schema
 */
export interface UpdateTenantRequest {
	name?: string
	email?: string
	phone?: string
	emergencyContact?: string
}

export const updateTenantSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		name: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		email: emailSchema,
		phone: phoneSchema,
		emergencyContact: {
			type: 'string',
			maxLength: 500
		}
	}
}

/**
 * Tenant query schema
 */
export interface TenantQueryRequest {
	search?: string
	invitationStatus?: 'PENDING' | 'SENT' | 'ACCEPTED' | 'EXPIRED'
	limit?: number
	offset?: number
	sortBy?: 'name' | 'email' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
}

export const tenantQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		search: {
			type: 'string'
		},
		invitationStatus: invitationStatusSchema,
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
			enum: ['name', 'email', 'createdAt'],
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
export const tenantRouteSchemas = {
	create: {
		body: createTenantSchema,
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
		body: updateTenantSchema,
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
		querystring: tenantQuerySchema,
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'string' },
						ownerId: { type: 'string' },
						name: { type: 'string' },
						email: { type: 'string' },
						phone: { type: 'string' },
						emergencyContact: { type: 'string' },
						invitationStatus: invitationStatusSchema,
						createdAt: { type: 'string' },
						updatedAt: { type: 'string' }
					}
				}
			}
		}
	}
} as const
