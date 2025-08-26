/**
 * Leases JSON Schema Definitions
 *
 * Ultra-native Fastify JSON Schema validation
 * Single source of truth - no duplication
 */

import type { JSONSchema } from '../shared/types/fastify-type-provider'
import { uuidSchema, dateSchema, moneySchema } from './shared.schema'

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
export interface CreateLeaseRequest {
	tenantId: string
	unitId: string
	startDate: string
	endDate: string
	monthlyRent: number
	securityDeposit: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
}

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
export interface UpdateLeaseRequest {
	startDate?: string
	endDate?: string
	monthlyRent?: number
	securityDeposit?: number
	paymentFrequency?: 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'YEARLY'
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
}

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
export interface LeaseQueryRequest {
	tenantId?: string
	unitId?: string
	propertyId?: string
	status?: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
	limit?: number
	offset?: number
	sortBy?: 'startDate' | 'endDate' | 'monthlyRent' | 'createdAt'
	sortOrder?: 'asc' | 'desc'
}

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
