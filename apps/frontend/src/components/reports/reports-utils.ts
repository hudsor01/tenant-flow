import { formatCurrency } from '#lib/formatters/currency'
import { format } from 'date-fns'

export const formatMoney = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export const formatPercent = (value: number) => `${value.toFixed(1)}%`

// Safe formatters for Recharts Tooltip (handles undefined)
export const safeFormatMoney = (value: number | undefined) =>
	formatMoney(value ?? 0)

export const safeFormatPercent = (value: number | undefined) =>
	formatPercent(value ?? 0)

export function getDefaultDateRange() {
	const today = new Date()
	const start = new Date(today)
	start.setMonth(today.getMonth() - 2)
	start.setDate(1)

	return {
		start: format(start, 'yyyy-MM-dd'),
		end: format(today, 'yyyy-MM-dd')
	}
}
