/**
 * Maintenance JSON Schema Definitions
 *
 * Express JSON Schema validation
 * Single source of truth - no duplication
 */

import type { JSONSchema } from '../shared/types/express-type-provider'
import { dateTimeSchema, uuidSchema } from './shared.schema'

const prioritySchema: JSONSchema = {
	type: 'string',
	enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
	default: 'MEDIUM'
}

const statusSchema: JSONSchema = {
	type: 'string',
	enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
	default: 'PENDING'
}

const categorySchema: JSONSchema = {
	type: 'string',
	enum: [
		'PLUMBING',
		'ELECTRICAL',
		'HVAC',
		'APPLIANCE',
		'STRUCTURAL',
		'GENERAL',
		'OTHER'
	],
	default: 'GENERAL'
}

/**
 * Create maintenance request schema
 */
export const createMaintenanceSchema: JSONSchema = {
	type: 'object',
	required: ['unitId', 'title', 'description'],
	additionalProperties: false,
	properties: {
		unitId: uuidSchema,
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		description: {
			type: 'string',
			minLength: 1,
			maxLength: 2000
		},
		priority: prioritySchema,
		category: categorySchema,
		scheduledDate: dateTimeSchema,
		estimatedCost: {
			type: 'number',
			minimum: 0,
			maximum: 999999
		}
	}
}

/**
 * Update maintenance request schema
 */
export const updateMaintenanceSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		title: {
			type: 'string',
			minLength: 1,
			maxLength: 255
		},
		description: {
			type: 'string',
			minLength: 1,
			maxLength: 2000
		},
		priority: prioritySchema,
		category: categorySchema,
		status: statusSchema,
		scheduledDate: dateTimeSchema,
		completedDate: dateTimeSchema,
		estimatedCost: {
			type: 'number',
			minimum: 0,
			maximum: 999999
		},
		actualCost: {
			type: 'number',
			minimum: 0,
			maximum: 999999
		},
		notes: {
			type: 'string',
			maxLength: 2000
		}
	}
}

/**
 * Maintenance query schema
 */
export const maintenanceQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		unitId: uuidSchema,
		propertyId: uuidSchema,
		priority: prioritySchema,
		category: categorySchema,
		status: statusSchema,
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
			enum: ['priority', 'status', 'scheduledDate', 'createdAt'],
			default: 'createdAt'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}
