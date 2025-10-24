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
