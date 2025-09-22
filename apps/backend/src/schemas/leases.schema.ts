/**
 * Leases JSON Schema Definitions
 *
 * Express JSON Schema validation
 * Single source of truth - no duplication
 */

import type { JSONSchema } from '../shared/types/express-type-provider'
import { dateSchema, moneySchema, uuidSchema } from './shared.schema'

const leaseStatusSchema: JSONSchema = {
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
		'tenantId',
		'unitId',
		'startDate',
		'endDate',
		'monthlyRent',
		'securityDeposit'
	],
	additionalProperties: false,
	properties: {
		tenantId: uuidSchema,
		unitId: uuidSchema,
		startDate: dateSchema,
		endDate: dateSchema,
		monthlyRent: moneySchema,
		securityDeposit: moneySchema,
		paymentFrequency: paymentFrequencySchema,
		status: leaseStatusSchema
	}
}

/**
 * Update lease request schema
 */
export const updateLeaseSchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		startDate: dateSchema,
		endDate: dateSchema,
		monthlyRent: moneySchema,
		securityDeposit: moneySchema,
		paymentFrequency: paymentFrequencySchema,
		status: leaseStatusSchema
	}
}

/**
 * Lease query schema
 */
export const leaseQuerySchema: JSONSchema = {
	type: 'object',
	additionalProperties: false,
	properties: {
		tenantId: uuidSchema,
		unitId: uuidSchema,
		propertyId: uuidSchema,
		status: leaseStatusSchema,
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
			enum: ['startDate', 'endDate', 'monthlyRent', 'createdAt'],
			default: 'createdAt'
		},
		sortOrder: {
			type: 'string',
			enum: ['asc', 'desc'],
			default: 'desc'
		}
	}
}
