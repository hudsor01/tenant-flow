/**
 * Centralized date formatting utilities
 * Consolidates duplicate formatDate implementations across lease templates
 */

import { logger } from '@/lib/logger'

export interface DateFormatOptions {
	format?: 'long' | 'short' | 'numeric'
	timezone?: string
	locale?: string
}

/**
 * Format date for lease documents
 * Replaces duplicate implementations in:
 * - /lib/lease-templates/base-lease-template.ts:115
 * - /lib/lease-templates/texas-residential-lease.ts:12
 * - /lib/lease-templates/texas-residential-lease.ts:348
 */
export function formatLeaseDate(
	dateString: string,
	options: DateFormatOptions = {}
): string {
	const { format = 'long', locale = 'en-US' } = options

	try {
		// Handle YYYY-MM-DD format by ensuring it's treated as local time
		let date: Date
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
			// Split date string to avoid timezone conversion issues
			const [year, month, day] = dateString.split('-').map(Number)
			date = new Date(year || 0, (month || 1) - 1, day || 1) // month is 0-indexed
		} else {
			date = new Date(dateString)
		}

		if (isNaN(date.getTime())) {
			throw new Error(`Invalid date string: ${dateString}`)
		}

		const formatOptions: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month:
				format === 'short'
					? 'short'
					: format === 'numeric'
						? 'numeric'
						: 'long',
			day: 'numeric'
		}

		return date.toLocaleDateString(locale, formatOptions)
	} catch (error) {
		logger.error('Date formatting error:', error)
		return dateString // Fallback to original string
	}
}

/**
 * Format date for signatures (specific to Texas lease requirements)
 */
export function formatSignatureDate(dateString: string): string {
	try {
		// Handle YYYY-MM-DD format by ensuring it's treated as local time
		let date: Date
		if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
			const [year, month, day] = dateString.split('-').map(Number)
			date = new Date(year || 0, (month || 1) - 1, day || 1) // month is 0-indexed
		} else {
			date = new Date(dateString)
		}

		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
	} catch (error) {
		logger.error('Signature date formatting error:', error)
		return dateString
	}
}