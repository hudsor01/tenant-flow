/**
 * Formatting utilities for TenantFlow
 */

/**
 * Format a number as currency (USD by default)
 */
export function formatCurrency(
	amount: number,
	currency: string = 'USD',
	locale: string = 'en-US'
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount)
}

/**
 * Format cents as currency (for Stripe amounts which are in cents)
 */
export function formatCents(
	cents: number,
	currency: string = 'USD',
	locale: string = 'en-US'
): string {
	return formatCurrency(cents / 100, currency, locale)
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(date: Date | number): string {
	const now = new Date()
	const target = typeof date === 'number' ? new Date(date) : date
	const diffMs = now.getTime() - target.getTime()
	const diffSecs = Math.floor(diffMs / 1000)
	const diffMins = Math.floor(diffSecs / 60)
	const diffHours = Math.floor(diffMins / 60)
	const diffDays = Math.floor(diffHours / 24)

	if (diffDays > 0) {
		return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`
	}
	if (diffHours > 0) {
		return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
	}
	if (diffMins > 0) {
		return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`
	}
	return 'Just now'
}
