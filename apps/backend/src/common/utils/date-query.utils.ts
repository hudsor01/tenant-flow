/**
 * Utility class for handling date-related query operations
 * Provides consistent date conversion and validation across services
 */
export class DateQueryUtils {
	/**
	 * Converts a value to ISO string format if it's a Date object
	 * @param date - Date, string, or undefined
	 * @returns ISO string or undefined
	 */
	static toISOString(
		date: Date | string | undefined | null
	): string | undefined {
		if (!date) {
			return undefined
		}

		if (date instanceof Date) {
			return date.toISOString()
		}

		// Validate if string is already in ISO format
		if (typeof date === 'string') {
			try {
				const parsed = new Date(date)
				if (!isNaN(parsed.getTime())) {
					return date // Return original if valid
				}
			} catch {
				return undefined
			}
		}

		return undefined
	}

	/**
	 * Normalizes date range query parameters
	 * Converts Date objects to ISO strings for repository compatibility
	 */
	static normalizeDateRange<T extends Record<string, unknown>>(query: T): T {
		const normalized: Record<string, unknown> = { ...query }

		// Common date range field patterns
		const dateFields = [
			'startDate',
			'endDate',
			'startDateFrom',
			'startDateTo',
			'endDateFrom',
			'endDateTo',
			'dateFrom',
			'dateTo',
			'createdFrom',
			'createdTo',
			'updatedFrom',
			'updatedTo',
			'moveInDateFrom',
			'moveInDateTo',
			'moveOutDateFrom',
			'moveOutDateTo'
		]

		dateFields.forEach(field => {
			if (field in normalized) {
				normalized[field] = this.toISOString(
					normalized[field] as Date | string | undefined | null
				)
			}
		})

		return normalized as T
	}

	/**
	 * Validates that end date is after start date
	 * @throws Error if validation fails
	 */
	static validateDateRange(
		startDate: Date | string,
		endDate: Date | string,
		fieldNames: { start?: string; end?: string } = {}
	): void {
		const start =
			typeof startDate === 'string' ? new Date(startDate) : startDate
		const end = typeof endDate === 'string' ? new Date(endDate) : endDate

		const startField = fieldNames.start || 'start date'
		const endField = fieldNames.end || 'end date'

		// Check for invalid dates
		if (isNaN(start.getTime())) {
			throw new Error(`Invalid ${startField}: ${startDate}`)
		}

		if (isNaN(end.getTime())) {
			throw new Error(`Invalid ${endField}: ${endDate}`)
		}

		// Check date order
		if (end <= start) {
			throw new Error(`${endField} must be after ${startField}`)
		}
	}

	/**
	 * Creates a date range filter for database queries
	 */
	static createDateRangeFilter(
		from?: Date | string | null,
		to?: Date | string | null
	): { gte?: Date; lte?: Date } | undefined {
		if (!from && !to) {
			return undefined
		}

		const filter: { gte?: Date; lte?: Date } = {}

		if (from) {
			const fromDate = typeof from === 'string' ? new Date(from) : from
			if (!isNaN(fromDate.getTime())) {
				filter.gte = fromDate
			}
		}

		if (to) {
			const toDate = typeof to === 'string' ? new Date(to) : to
			if (!isNaN(toDate.getTime())) {
				filter.lte = toDate
			}
		}

		return Object.keys(filter).length > 0 ? filter : undefined
	}

	/**
	 * Checks if a date is within a range
	 */
	static isDateInRange(
		date: Date | string,
		rangeStart: Date | string,
		rangeEnd: Date | string
	): boolean {
		const checkDate = typeof date === 'string' ? new Date(date) : date
		const start =
			typeof rangeStart === 'string' ? new Date(rangeStart) : rangeStart
		const end = typeof rangeEnd === 'string' ? new Date(rangeEnd) : rangeEnd

		return checkDate >= start && checkDate <= end
	}

	/**
	 * Formats a date for display (ISO date portion only)
	 */
	static toDateString(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toISOString().split('T')[0] ?? ''
	}

	/**
	 * Gets the start of day for a date (00:00:00.000)
	 */
	static startOfDay(date: Date | string): Date {
		const d = typeof date === 'string' ? new Date(date) : new Date(date)
		d.setHours(0, 0, 0, 0)
		return d
	}

	/**
	 * Gets the end of day for a date (23:59:59.999)
	 */
	static endOfDay(date: Date | string): Date {
		const d = typeof date === 'string' ? new Date(date) : new Date(date)
		d.setHours(23, 59, 59, 999)
		return d
	}

	/**
	 * Adds days to a date
	 */
	static addDays(date: Date | string, days: number): Date {
		const d = typeof date === 'string' ? new Date(date) : new Date(date)
		d.setDate(d.getDate() + days)
		return d
	}

	/**
	 * Calculates the difference in days between two dates
	 */
	static daysBetween(start: Date | string, end: Date | string): number {
		const startDate = typeof start === 'string' ? new Date(start) : start
		const endDate = typeof end === 'string' ? new Date(end) : end

		const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
	}
}
