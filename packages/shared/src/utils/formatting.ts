/**
 * Formatting utilities for common display patterns
 * Re-exports currency formatters and provides date formatting
 */

import {
	formatCurrency as formatCurrencyValue,
	formatCurrencyChange as formatCurrencyChangeValue
} from './currency'

/** @see {@link formatCurrencyValue} for full documentation */
export const formatCurrency = formatCurrencyValue
/** @see {@link formatCurrencyChangeValue} for full documentation */
export const formatCurrencyChange = formatCurrencyChangeValue

/**
 * Formats an ISO date string as a localized date display
 *
 * @param iso - ISO 8601 date string (e.g., '2024-03-15T10:30:00Z')
 * @returns Formatted date string (e.g., 'March 15, 2024') or empty string if undefined
 *
 * @example
 * formatDate('2024-03-15T10:30:00Z') // 'March 15, 2024'
 * formatDate(undefined) // ''
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
