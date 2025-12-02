import { differenceInCalendarDays } from 'date-fns'

export type DateInput = string | number | Date | null | undefined

export interface FormatDateOptions {
	locale?: string
	style?: 'short' | 'long'
	relative?: boolean
	relativeThresholdDays?: number
	relativeTo?: Date
	formatOptions?: Intl.DateTimeFormatOptions
	fallback?: string
}

const toDate = (value: DateInput): Date | null => {
	if (value === null || value === undefined) return null
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value
	}

	if (typeof value === 'number') {
		const ms = value < 1_000_000_000_000 ? value * 1000 : value
		const date = new Date(ms)
		return isNaN(date.getTime()) ? null : date
	}

	const normalized =
		typeof value === 'string' && !value.includes('T')
			? `${value}T00:00:00Z`
			: value

	const date = new Date(normalized)
	return isNaN(date.getTime()) ? null : date
}

const formatWithIntl = (
	date: Date,
	locale: string,
	style: 'short' | 'long',
	formatOptions?: Intl.DateTimeFormatOptions
): string => {
	const options =
		formatOptions ??
		(style === 'long'
			? { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
			: { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

	return new Intl.DateTimeFormat(locale, options).format(date)
}

export const formatDate = (
	value: DateInput,
	{
		locale = 'en-US',
		style = 'short',
		relative = false,
		relativeThresholdDays = 7,
		relativeTo = new Date(),
		formatOptions,
		fallback
	}: FormatDateOptions = {}
): string => {
	const date = toDate(value)
	if (!date) return fallback ?? ''

	if (relative) {
		const diffMs = date.getTime() - relativeTo.getTime()
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
		const absDays = Math.abs(diffDays)

		if (absDays === 0) return 'Today'
		if (absDays === 1) return diffDays > 0 ? 'Tomorrow' : 'Yesterday'
		if (absDays < relativeThresholdDays) {
			return diffDays > 0 ? `In ${absDays} days` : `${absDays} days ago`
		}
	}

	return formatWithIntl(date, locale, style, formatOptions)
}

export const formatRelativeDate = (
	value: DateInput,
	{ baseDate = new Date(), addSuffix = true }: { baseDate?: Date; addSuffix?: boolean } = {}
): string => {
	const date = toDate(value)
	if (!date) return ''
	const dayDiff = differenceInCalendarDays(baseDate, date)
	const absDays = Math.abs(dayDiff)

	if (absDays === 0) return 'Today'

	const displayDays = dayDiff > 0 ? absDays + 1 : absDays

	if (!addSuffix) return `${displayDays} days`
	return dayDiff > 0 ? `${displayDays} days ago` : `In ${displayDays} days`
}

export const formatDateRange = (
	start: DateInput,
	end: DateInput,
	options: FormatDateOptions = {}
): string => {
	const startDate = toDate(start)
	const endDate = toDate(end)

	if (!startDate && !endDate) return options.fallback ?? ''
	if (startDate && !endDate) return formatDate(startDate, options)
	if (!startDate && endDate) return formatDate(endDate, options)

	return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`
}
