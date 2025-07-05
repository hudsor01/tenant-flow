/**
 * Currency and number formatting utilities for consistent display across the application
 */

// Format currency with proper locale and symbol
export const formatCurrency = (
	amount: number,
	options: {
		locale?: string
		currency?: string
		minimumFractionDigits?: number
		maximumFractionDigits?: number
		compact?: boolean
	} = {}
): string => {
	const {
		locale = 'en-US',
		currency = 'USD',
		minimumFractionDigits = 0,
		maximumFractionDigits = 2,
		compact = false
	} = options

	const formatter = new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits,
		maximumFractionDigits,
		notation: compact ? 'compact' : 'standard',
		compactDisplay: 'short'
	})

	return formatter.format(amount)
}

// Format large numbers with K, M, B suffixes
export const formatCompactCurrency = (amount: number): string => {
	return formatCurrency(amount, { compact: true, maximumFractionDigits: 1 })
}

// Format percentage with consistent styling
export const formatPercentage = (
	value: number,
	options: {
		minimumFractionDigits?: number
		maximumFractionDigits?: number
	} = {}
): string => {
	const { minimumFractionDigits = 0, maximumFractionDigits = 1 } = options

	const formatter = new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits,
		maximumFractionDigits
	})

	return formatter.format(value / 100)
}

// Format numbers with thousand separators
export const formatNumber = (
	value: number,
	options: {
		minimumFractionDigits?: number
		maximumFractionDigits?: number
		compact?: boolean
	} = {}
): string => {
	const {
		minimumFractionDigits = 0,
		maximumFractionDigits = 0,
		compact = false
	} = options

	const formatter = new Intl.NumberFormat('en-US', {
		minimumFractionDigits,
		maximumFractionDigits,
		notation: compact ? 'compact' : 'standard',
		compactDisplay: 'short'
	})

	return formatter.format(value)
}

// Format currency change with proper +/- indicators
export const formatCurrencyChange = (
	amount: number,
	showSign = true
): string => {
	const formatted = formatCurrency(Math.abs(amount))
	if (!showSign) return formatted

	return amount >= 0 ? `+${formatted}` : `-${formatted}`
}

// Format percentage change with proper +/- indicators
export const formatPercentageChange = (
	value: number,
	showSign = true
): string => {
	const formatted = formatPercentage(Math.abs(value))
	if (!showSign) return formatted

	return value >= 0 ? `+${formatted}` : `-${formatted}`
}

// Get currency display for dashboard cards
export const getDashboardCurrency = (
	amount: number
): {
	value: string
	compact: string
	raw: number
} => {
	return {
		value: formatCurrency(amount),
		compact: formatCompactCurrency(amount),
		raw: amount
	}
}

// Get percentage display with color coding
export const getDashboardPercentage = (
	value: number
): {
	value: string
	color: string
	trend: 'positive' | 'negative' | 'neutral'
} => {
	const trend = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
	const color =
		trend === 'positive'
			? 'text-green-600'
			: trend === 'negative'
				? 'text-red-600'
				: 'text-muted-foreground'

	return {
		value: formatPercentage(value),
		color,
		trend
	}
}

// Collection rate status helper
export const getCollectionRateStatus = (
	rate: number
): {
	status: string
	color: string
	icon: string
} => {
	if (rate >= 95) {
		return { status: 'Excellent', color: 'text-green-600', icon: '🎯' }
	} else if (rate >= 85) {
		return { status: 'Good', color: 'text-blue-600', icon: '👍' }
	} else if (rate >= 70) {
		return { status: 'Fair', color: 'text-orange-600', icon: '⚠️' }
	} else {
		return { status: 'Poor', color: 'text-red-600', icon: '🔻' }
	}
}
