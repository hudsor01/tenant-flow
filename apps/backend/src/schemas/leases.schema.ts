/**
 * Leases JSON Schema Definitions
 *
 * Express JSON Schema validation
 * Single source of truth - no duplication
 */

import type { JSONSchema } from '../shared/types/express-type-provider'
import { dateSchema, moneySchema, uuidSchema } from './shared.schema'

const lease_statusSchema: JSONSchema = {
	type: 'string',
	enum: ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'],
	default: 'DRAFT'
}

const paymentFrequencySchema: JSONSchema = {
	type: 'string',
	enum: ['MONTHLY', 'WEEKLY', 'BIWEEKLY', 'YEARLY'],
	default: 'MONTHLY'
}

/**
 * Create lease request schema
 */
export const createLeaseSchema: JSONSchema = {
	type: 'object',
	required: [
		'tenant_id',
		'unit_id',
		'start_date',
		'end_date',
		'rent_amount',
		'security_deposit'
	],
	additionalProperties: false,
	properties: {
		tenant_id: uuidSchema,
		unit_id: uuidSchema,
		start_date: dateSchema,
		end_date: dateSchema,
		rent_amount: moneySchema,
		security_deposit: moneySchema,
		paymentFrequency: paymentFrequencySchema,
		status: lease_statusSchema
	}
}

/**
 * Update lease request schema
 */
export const updateLeaseSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		start_date: dateSchema,
		end_date: dateSchema,
		rent_amount: moneySchema,
		security_deposit: moneySchema,
		paymentFrequency: paymentFrequencySchema,
		status: lease_statusSchema
	}
}

/**
 * Lease query schema
 */
export const leaseQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		tenant_id: uuidSchema,
		unit_id: uuidSchema,
		property_id: uuidSchema,
		status: lease_statusSchema,
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
			enum: ['start_date', 'end_date', 'rent_amount', 'created_at'],
			default: 'created_at'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}
