/**
 * Formats a cents value as a localized currency string
 *
 * @param cents - Amount in cents (e.g., 1250 = $12.50)
 * @param locale - BCP 47 locale string (default: 'en-US')
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @returns Formatted currency string (e.g., '$12.50')
 *
 * @example
 * formatCents(1250) // '$12.50'
 * formatCents(1250, 'de-DE', 'EUR') // '12,50 €'
 * formatCents(null) // '$0.00'
 */
export function formatCents(
	cents: number | null | undefined,
	locale = 'en-US',
	currency = 'USD'
) {
	try {
		const value = Number(cents ?? 0) / 100
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency
		}).format(value)
	} catch {
		return '$0.00'
	}
}
