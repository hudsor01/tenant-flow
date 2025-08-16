/**
 * Stripe Invoice Line Item Type Definitions for TenantFlow
 *
 * Comprehensive type definitions for Invoice Line Items based on official Stripe API documentation.
 * These types cover line item details, tax calculations, discounts, and proration handling.
 */

import type { SupportedCurrency, StripeMetadata } from './stripe'
import type { StripePrice } from './stripe-core-objects'

// ========================
// Invoice Line Item Types
// ========================

export const INVOICE_LINE_ITEM_TYPES = {
	INVOICEITEM: 'invoiceitem',
	SUBSCRIPTION: 'subscription'
} as const

export type InvoiceLineItemType =
	(typeof INVOICE_LINE_ITEM_TYPES)[keyof typeof INVOICE_LINE_ITEM_TYPES]

export interface InvoiceLineItemDiscountAmount {
	readonly amount: number
	readonly discount: string
}

export interface InvoiceLineItemPeriod {
	readonly end: number
	readonly start: number
}

export interface InvoiceLineItemProrationDetails {
	readonly credited_items?: {
		readonly invoice: string
		readonly invoice_line_items: string[]
	} | null
}

export interface InvoiceLineItemTaxAmount {
	readonly amount: number
	readonly inclusive: boolean
	readonly tax_rate: string
	readonly taxability_reason?:
		| 'customer_exempt'
		| 'not_collecting'
		| 'not_subject_to_tax'
		| 'not_supported'
		| 'portion_product_exempt'
		| 'portion_reduced_rated'
		| 'portion_standard_rated'
		| 'product_exempt'
		| 'product_exempt_holiday'
		| 'proportionally_rated'
		| 'reduced_rated'
		| 'reverse_charge'
		| 'standard_rated'
		| 'taxable_basis_reduced'
		| 'zero_rated'
		| null
	readonly taxable_amount?: number | null
}

export interface InvoiceLineItemTaxRate {
	readonly id: string
	readonly object: 'tax_rate'
	readonly active: boolean
	readonly country?: string | null
	readonly created: number
	readonly description?: string | null
	readonly display_name: string
	readonly effective_percentage?: number | null
	readonly inclusive: boolean
	readonly jurisdiction?: string | null
	readonly jurisdiction_level?:
		| 'city'
		| 'country'
		| 'county'
		| 'district'
		| 'multiple'
		| 'state'
		| null
	readonly livemode: boolean
	readonly metadata: StripeMetadata
	readonly percentage: number
	readonly state?: string | null
	readonly tax_type?:
		| 'amusement_tax'
		| 'communications_tax'
		| 'gst'
		| 'hst'
		| 'igst'
		| 'jct'
		| 'lease_tax'
		| 'pst'
		| 'qst'
		| 'rst'
		| 'sales_tax'
		| 'vat'
		| null
}

/**
 * Main Invoice Line Item object
 * Represents a single line item on an invoice including tax and discount calculations
 */
export interface StripeInvoiceLineItem {
	readonly id: string
	readonly object: 'line_item'
	readonly amount: number
	readonly amount_excluding_tax?: number | null
	readonly currency: SupportedCurrency
	readonly description?: string | null
	readonly discount_amounts?: InvoiceLineItemDiscountAmount[] | null
	readonly discountable: boolean
	readonly discounts?: string[] | null
	readonly invoice?: string | null
	readonly invoice_item?: string | null
	readonly livemode: boolean
	readonly metadata: StripeMetadata
	readonly period: InvoiceLineItemPeriod
	readonly plan?: StripePrice | null // Legacy field, use price instead
	readonly price?: StripePrice | null
	readonly proration: boolean
	readonly proration_details?: InvoiceLineItemProrationDetails | null
	readonly quantity?: number | null
	readonly subscription?: string | null
	readonly subscription_item?: string | null
	readonly tax_amounts?: InvoiceLineItemTaxAmount[] | null
	readonly tax_rates?: InvoiceLineItemTaxRate[] | null
	readonly type: InvoiceLineItemType
	readonly unit_amount_excluding_tax?: string | null
}

/**
 * Simplified line item for creation/updates
 */
export interface InvoiceLineItemCreateParams {
	readonly amount?: number
	readonly currency?: SupportedCurrency
	readonly description?: string
	readonly discountable?: boolean
	readonly discounts?: {
		readonly coupon?: string
		readonly discount?: string
		readonly promotion_code?: string
	}[]
	readonly invoice_item?: string
	readonly metadata?: StripeMetadata
	readonly period?: {
		readonly end: number
		readonly start: number
	}
	readonly price?: string
	readonly price_data?: {
		readonly currency: SupportedCurrency
		readonly product?: string
		readonly tax_behavior?: 'exclusive' | 'inclusive' | 'unspecified'
		readonly unit_amount?: number
		readonly unit_amount_decimal?: string
	}
	readonly quantity?: number
	readonly tax_amounts?: {
		readonly amount: number
		readonly tax_rate_data: {
			readonly country?: string
			readonly description?: string
			readonly display_name: string
			readonly inclusive: boolean
			readonly jurisdiction?: string
			readonly percentage: number
			readonly state?: string
			readonly tax_type?:
				| 'amusement_tax'
				| 'communications_tax'
				| 'gst'
				| 'hst'
				| 'igst'
				| 'jct'
				| 'lease_tax'
				| 'pst'
				| 'qst'
				| 'rst'
				| 'sales_tax'
				| 'vat'
		}
		readonly taxable_amount: number
	}[]
	readonly tax_rates?: string[]
}

// ========================
// Line Item Collections
// ========================

/**
 * Collection of line items as returned by Stripe API
 */
export interface StripeInvoiceLineItemList {
	readonly object: 'list'
	readonly data: StripeInvoiceLineItem[]
	readonly has_more: boolean
	readonly url: string
}

// ========================
// Utility Functions
// ========================

/**
 * Type guard for Invoice Line Item objects
 */
export function isStripeInvoiceLineItem(
	obj: unknown
): obj is StripeInvoiceLineItem {
	return (
		obj !== null &&
		typeof obj === 'object' &&
		'object' in obj &&
		obj.object === 'line_item' &&
		'id' in obj &&
		typeof obj.id === 'string'
	)
}

/**
 * Calculate total line item amount including tax
 */
export function getLineItemTotal(lineItem: StripeInvoiceLineItem): number {
	return lineItem.amount
}

/**
 * Calculate line item amount excluding tax
 */
export function getLineItemAmountExcludingTax(
	lineItem: StripeInvoiceLineItem
): number {
	return lineItem.amount_excluding_tax || lineItem.amount
}

/**
 * Get total tax amount for a line item
 */
export function getLineItemTaxAmount(lineItem: StripeInvoiceLineItem): number {
	if (!lineItem.tax_amounts) return 0
	return lineItem.tax_amounts.reduce(
		(total, taxAmount) => total + taxAmount.amount,
		0
	)
}

/**
 * Get total discount amount for a line item
 */
export function getLineItemDiscountAmount(
	lineItem: StripeInvoiceLineItem
): number {
	if (!lineItem.discount_amounts) return 0
	return lineItem.discount_amounts.reduce(
		(total, discount) => total + discount.amount,
		0
	)
}

/**
 * Check if line item is prorated
 */
export function isLineItemProrated(lineItem: StripeInvoiceLineItem): boolean {
	return lineItem.proration === true
}

/**
 * Check if line item is from subscription
 */
export function isLineItemFromSubscription(
	lineItem: StripeInvoiceLineItem
): boolean {
	return lineItem.type === 'subscription'
}

/**
 * Check if line item is a one-time charge
 */
export function isLineItemOneTime(lineItem: StripeInvoiceLineItem): boolean {
	return lineItem.type === 'invoiceitem'
}

/**
 * Get line item unit price in dollars
 */
export function getLineItemUnitPrice(
	lineItem: StripeInvoiceLineItem
): number | null {
	if (lineItem.price?.unit_amount) {
		return lineItem.price.unit_amount / 100
	}

	if (lineItem.quantity && lineItem.quantity > 0) {
		return lineItem.amount / lineItem.quantity / 100
	}

	return null
}

/**
 * Get formatted line item description
 */
export function getLineItemDescription(
	lineItem: StripeInvoiceLineItem
): string {
	if (lineItem.description) {
		return lineItem.description
	}

	if (lineItem.price?.nickname) {
		return lineItem.price.nickname
	}

	if (lineItem.type === 'subscription') {
		return 'Subscription charge'
	}

	return 'Invoice item'
}

/**
 * Get line item billing period
 */
export function getLineItemBillingPeriod(lineItem: StripeInvoiceLineItem): {
	start: Date
	end: Date
} {
	return {
		start: new Date(lineItem.period.start * 1000),
		end: new Date(lineItem.period.end * 1000)
	}
}

/**
 * Check if line item has tax exemption
 */
export function isLineItemTaxExempt(lineItem: StripeInvoiceLineItem): boolean {
	return !lineItem.tax_amounts || lineItem.tax_amounts.length === 0
}

/**
 * Get effective tax rate for line item
 */
export function getLineItemEffectiveTaxRate(
	lineItem: StripeInvoiceLineItem
): number {
	if (!lineItem.tax_amounts || lineItem.tax_amounts.length === 0) {
		return 0
	}

	const totalTax = getLineItemTaxAmount(lineItem)
	const baseAmount = getLineItemAmountExcludingTax(lineItem)

	if (baseAmount === 0) return 0

	return (totalTax / baseAmount) * 100
}

/**
 * Extract TenantFlow-specific metadata from line item
 */
export function extractTenantFlowMetadata(lineItem: StripeInvoiceLineItem): {
	organizationId?: string
	userId?: string
	planType?: string
	source?: string
} {
	const metadata = lineItem.metadata || {}

	return {
		organizationId:
			metadata.tenantflow_organization_id || metadata.organization_id,
		userId: metadata.tenantflow_user_id || metadata.user_id,
		planType: metadata.tenantflow_plan_type || metadata.plan_type,
		source: metadata.tenantflow_source || metadata.source
	}
}
