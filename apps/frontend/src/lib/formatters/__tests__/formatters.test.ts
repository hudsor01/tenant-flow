import { describe, expect, it } from 'vitest'

import {
	formatCurrency,
	formatNumber,
	formatDate,
	formatRelativeDate,
	formatCents
} from '..'

describe('date formatters', () => {
	it('formats dates with short and long styles', () => {
		expect(formatDate('2025-02-01')).toBe('Feb 1, 2025')
		expect(formatDate('2025-02-01', { style: 'long' })).toBe('February 1, 2025')
	})

	it('handles numeric timestamps in seconds and milliseconds', () => {
		expect(formatDate(1735689600)).toBe('Jan 1, 2025')
		expect(formatDate(1735689600000)).toBe('Jan 1, 2025')
	})

	it('returns relative labels when requested', () => {
		const base = new Date('2025-01-10T00:00:00Z')
		expect(formatDate('2025-01-10', { relative: true, relativeTo: base })).toBe('Today')
		expect(formatDate('2025-01-09', { relative: true, relativeTo: base })).toBe('Yesterday')
		expect(formatDate('2025-01-07', { relative: true, relativeTo: base })).toBe('3 days ago')
		expect(formatDate('2025-01-13', { relative: true, relativeTo: base })).toBe('In 3 days')
	})

	it('formats relative distance with suffix', () => {
		const base = new Date('2025-03-01T00:00:00Z')
		expect(formatRelativeDate('2025-02-28', { baseDate: base })).toBe('2 days ago')
	})
})

describe('numeric formatters', () => {
	it('formats currency and cents consistently', () => {
		expect(formatCurrency(1234.5)).toBe('$1,234.50')
		expect(formatCents(1299)).toBe('$12.99')
	})

	it('formats numbers with compact notation', () => {
		expect(formatNumber(15300, { compact: true, maximumFractionDigits: 1 })).toBe('15.3K')
	})
})
