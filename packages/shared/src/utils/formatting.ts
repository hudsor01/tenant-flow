/**
 * Formatting utilities
 * Commonly used formatting functions
 */

import {
	formatCurrency as formatCurrencyValue,
	formatCurrencyChange as formatCurrencyChangeValue
} from './currency'

export const formatCurrency = formatCurrencyValue
export const formatCurrencyChange = formatCurrencyChangeValue

/**
 * Simple date formatting for shared package usage
 * For more advanced formatting, use the frontend formatters
 */
export function formatDate(iso: string | undefined): string {
	if (!iso) return ''
	const date = new Date(iso)
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}
