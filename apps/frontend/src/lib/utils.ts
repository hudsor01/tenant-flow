import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format a number as currency with locale-aware formatting
 * @param amount - The amount to format (in cents or dollars based on convertFromCents)
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
	amount: number,
	options?: {
		locale?: string
		currency?: string
		convertFromCents?: boolean
	}
): string {
	const {
		locale = 'en-US',
		currency = 'USD',
		convertFromCents = false
	} = options ?? {}

	// Assume valid input - let errors bubble up
	const value = convertFromCents ? amount / 100 : amount

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)
}

/**
 * Format a number with locale-aware formatting
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted number string (e.g., "1,234.56")
 */
export function formatNumber(
	value: number,
	options?: {
		locale?: string
		minimumFractionDigits?: number
		maximumFractionDigits?: number
	}
): string {
	const {
		locale = 'en-US',
		minimumFractionDigits = 0,
		maximumFractionDigits = 2
	} = options ?? {}

	return new Intl.NumberFormat(locale, {
		minimumFractionDigits,
		maximumFractionDigits
	}).format(value)
}

/**
 * Format a number as a percentage
 * @param value - The value to format (e.g., 0.1234 for 12.34%)
 * @param options - Formatting options
 * @returns Formatted percentage string (e.g., "12.34%")
 */
export function formatPercentage(
	value: number,
	options?: {
		locale?: string
		minimumFractionDigits?: number
		maximumFractionDigits?: number
	}
): string {
	const {
		locale = 'en-US',
		minimumFractionDigits = 0,
		maximumFractionDigits = 2
	} = options ?? {}

	// Assume valid input - let errors bubble up
	return new Intl.NumberFormat(locale, {
		style: 'percent',
		minimumFractionDigits,
		maximumFractionDigits
	}).format(value)
}
