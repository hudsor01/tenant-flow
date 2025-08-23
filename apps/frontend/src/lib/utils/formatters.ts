// Simple utility functions for formatting

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount)
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US').format(date)
}