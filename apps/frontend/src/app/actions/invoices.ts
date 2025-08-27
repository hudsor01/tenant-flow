/**
 * Server Actions for Invoice Business Logic
 * MOVED FROM: lib/generators/invoice-pdf.ts
 * REASON: Financial calculations belong in backend for accuracy and auditability
 */

'use server'

import type { CustomerInvoiceForm, InvoiceItemForm } from '@repo/shared'

export interface InvoiceCalculations {
	items: Array<{
		description: string
		quantity: number
		unitPrice: number
		lineTotal: number
	}>
	subtotal: number
	taxAmount: number
	total: number
	taxRate: number
}

export interface InvoiceFormState {
	success: boolean
	error?: string
	data?: InvoiceCalculations
}

/**
 * Calculate Invoice Totals - Server Action
 * MOVED FROM: Frontend PDF generator
 * REASON: Financial calculations must be server-authoritative for audit trails
 */
export async function calculateInvoiceTotals(
	items: InvoiceItemForm[],
	taxRate: number = 0
): Promise<InvoiceFormState> {
	try {
		// Validate inputs
		if (!Array.isArray(items)) {
			return {
				success: false,
				error: 'Invalid items array'
			}
		}

		if (taxRate < 0 || taxRate > 100) {
			return {
				success: false,
				error: 'Tax rate must be between 0 and 100'
			}
		}

		// Calculate line totals with proper rounding
		const calculatedItems = items.map(item => {
			const quantity = Number(item.quantity) || 0
			const unitPrice = Number(item.unitPrice) || 0
			
			// Validate individual item values
			if (quantity < 0) {
				throw new Error(`Invalid quantity: ${quantity}`)
			}
			if (unitPrice < 0) {
				throw new Error(`Invalid unit price: ${unitPrice}`)
			}

			const lineTotal = Math.round((quantity * unitPrice) * 100) / 100

			return {
				description: item.description || '',
				quantity,
				unitPrice,
				lineTotal
			}
		})

		// Calculate subtotal
		const subtotal = Math.round(
			calculatedItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100
		) / 100

		// Calculate tax amount
		const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100

		// Calculate total
		const total = Math.round((subtotal + taxAmount) * 100) / 100

		return {
			success: true,
			data: {
				items: calculatedItems,
				subtotal,
				taxAmount,
				total,
				taxRate
			}
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to calculate invoice totals'
		}
	}
}

/**
 * Prepare Invoice for PDF Generation - Server Action
 * BUSINESS LOGIC: Normalize and calculate all invoice data server-side
 */
export async function prepareInvoiceForPdf(
	invoice: CustomerInvoiceForm
): Promise<InvoiceFormState> {
	try {
		// Calculate totals using server-side logic
		const calculationsResult = await calculateInvoiceTotals(
			invoice.items || [],
			invoice.taxRate || 0
		)

		if (!calculationsResult.success || !calculationsResult.data) {
			return calculationsResult
		}

		const calculations = calculationsResult.data

		// Return normalized invoice with server-calculated values
		const normalizedInvoice = {
			...invoice,
			items: calculations.items,
			subtotal: calculations.subtotal,
			taxAmount: calculations.taxAmount,
			total: calculations.total,
			taxRate: calculations.taxRate
		}

		return {
			success: true,
			data: normalizedInvoice as unknown as InvoiceCalculations
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to prepare invoice'
		}
	}
}

/**
 * Calculate Invoice Line Item - Server Action
 * BUSINESS LOGIC: Individual line item calculation for real-time updates
 */
export async function calculateLineItem(
	quantity: number,
	unitPrice: number
): Promise<{ success: boolean; lineTotal?: number; error?: string }> {
	try {
		if (quantity < 0 || unitPrice < 0) {
			return {
				success: false,
				error: 'Quantity and unit price must be non-negative'
			}
		}

		const lineTotal = Math.round((quantity * unitPrice) * 100) / 100

		return {
			success: true,
			lineTotal
		}
	} catch (error) {
		return {
			success: false,
			error: 'Failed to calculate line item'
		}
	}
}