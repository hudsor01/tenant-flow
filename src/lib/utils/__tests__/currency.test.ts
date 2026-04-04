import { describe, it, expect } from 'vitest'
import {
	formatCurrency,
	formatCents,
	formatPrice,
	getIntervalSuffix,
	formatCompactCurrency,
	formatPercentage,
	formatNumber,
	formatCurrencyChange,
	formatPercentageChange,
	getDashboardCurrency,
	getDashboardPercentage,
	getCollectionRateStatus
} from '../currency'

describe('formatCurrency', () => {
	it('formats whole dollar amount', () => {
		expect(formatCurrency(100)).toBe('$100.00')
	})
	it('formats zero', () => {
		expect(formatCurrency(0)).toBe('$0.00')
	})
	it('formats decimal amounts', () => {
		expect(formatCurrency(99.99, { minimumFractionDigits: 2 })).toBe('$99.99')
	})
	it('formats large amounts', () => {
		expect(formatCurrency(1000000)).toBe('$1,000,000.00')
	})
	it('formats negative amounts', () => {
		expect(formatCurrency(-50)).toBe('-$50.00')
	})
	it('uses compact notation when requested', () => {
		const result = formatCurrency(1500, { compact: true })
		expect(result).toMatch(/\$1\.50?K/i)
	})
})

describe('formatCents', () => {
	it('converts cents to formatted dollars', () => {
		expect(formatCents(1299)).toBe('$12.99')
	})
	it('handles whole dollar cent amounts', () => {
		expect(formatCents(500)).toBe('$5.00')
	})
	it('handles zero', () => {
		expect(formatCents(0)).toBe('$0.00')
	})
})

describe('formatPrice', () => {
	it('returns "Free" for zero', () => {
		expect(formatPrice(0)).toBe('Free')
	})
	it('returns "Custom" for -1', () => {
		expect(formatPrice(-1)).toBe('Custom')
	})
	it('formats whole dollar amount', () => {
		expect(formatPrice(29)).toBe('$29')
	})
	it('formats decimal amount with cents', () => {
		expect(formatPrice(29.99)).toBe('$29.99')
	})
	it('adds monthly interval suffix', () => {
		expect(formatPrice(29, { interval: 'monthly' })).toBe('$29/mo')
	})
	it('adds annual interval suffix', () => {
		expect(formatPrice(299, { interval: 'annual' })).toBe('$299/yr')
	})
	it('omits interval when showInterval is false', () => {
		expect(formatPrice(29, { interval: 'monthly', showInterval: false })).toBe(
			'$29'
		)
	})
	it('converts from cents when fromCents is true', () => {
		expect(formatPrice(2900, { fromCents: true })).toBe('$29')
	})
	it('formats cents amount with decimals when not divisible by 100', () => {
		expect(formatPrice(2999, { fromCents: true })).toBe('$29.99')
	})
})

describe('getIntervalSuffix', () => {
	it('returns /mo for monthly', () => {
		expect(getIntervalSuffix('monthly')).toBe('/mo')
	})
	it('returns /mo for month', () => {
		expect(getIntervalSuffix('month')).toBe('/mo')
	})
	it('returns /yr for annual', () => {
		expect(getIntervalSuffix('annual')).toBe('/yr')
	})
	it('returns /yr for year', () => {
		expect(getIntervalSuffix('year')).toBe('/yr')
	})
})

describe('formatCompactCurrency', () => {
	it('formats thousands', () => {
		const result = formatCompactCurrency(1500)
		expect(result).toMatch(/\$1\.5K/i)
	})
	it('formats millions', () => {
		const result = formatCompactCurrency(2500000)
		expect(result).toMatch(/\$2\.5M/i)
	})
})

describe('formatPercentage', () => {
	it('formats whole percentage (divides by 100)', () => {
		expect(formatPercentage(85)).toBe('85%')
	})
	it('formats zero', () => {
		expect(formatPercentage(0)).toBe('0%')
	})
	it('formats decimal percentage', () => {
		expect(formatPercentage(33.3)).toBe('33.3%')
	})
	it('formats 100%', () => {
		expect(formatPercentage(100)).toBe('100%')
	})
	it('respects minimumFractionDigits', () => {
		expect(formatPercentage(50, { minimumFractionDigits: 1 })).toBe('50.0%')
	})
})

describe('formatNumber', () => {
	it('formats with thousand separators', () => {
		expect(formatNumber(1234567)).toBe('1,234,567')
	})
	it('formats zero', () => {
		expect(formatNumber(0)).toBe('0')
	})
	it('formats compact with K suffix', () => {
		const result = formatNumber(1500, { compact: true })
		expect(result).toMatch(/1\.5K|2K/i)
	})
	it('formats with decimal places', () => {
		expect(
			formatNumber(42.567, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			})
		).toBe('42.57')
	})
})

describe('formatCurrencyChange', () => {
	it('adds + prefix for positive amounts', () => {
		expect(formatCurrencyChange(500)).toBe('+$500.00')
	})
	it('adds - prefix for negative amounts', () => {
		expect(formatCurrencyChange(-200)).toBe('-$200.00')
	})
	it('adds + prefix for zero', () => {
		expect(formatCurrencyChange(0)).toBe('+$0.00')
	})
	it('omits sign when showSign is false', () => {
		expect(formatCurrencyChange(500, false)).toBe('$500.00')
		expect(formatCurrencyChange(-200, false)).toBe('$200.00')
	})
})

describe('formatPercentageChange', () => {
	it('adds + prefix for positive', () => {
		expect(formatPercentageChange(10)).toBe('+10%')
	})
	it('adds - prefix for negative', () => {
		expect(formatPercentageChange(-5)).toBe('-5%')
	})
	it('omits sign when showSign is false', () => {
		expect(formatPercentageChange(10, false)).toBe('10%')
	})
})

describe('getDashboardCurrency', () => {
	it('returns value, compact, and raw fields', () => {
		const result = getDashboardCurrency(1500)
		expect(result.value).toBe('$1,500.00')
		expect(result.compact).toMatch(/\$1\.5K/i)
		expect(result.raw).toBe(1500)
	})
	it('handles zero', () => {
		const result = getDashboardCurrency(0)
		expect(result.value).toBe('$0.00')
		expect(result.raw).toBe(0)
	})
})

describe('getDashboardPercentage', () => {
	it('returns positive trend for positive value', () => {
		const result = getDashboardPercentage(10)
		expect(result.trend).toBe('positive')
		expect(result.color).toBe('text-success')
		expect(result.value).toBe('10%')
	})
	it('returns negative trend for negative value', () => {
		const result = getDashboardPercentage(-5)
		expect(result.trend).toBe('negative')
		expect(result.color).toBe('text-destructive')
	})
	it('returns neutral trend for zero', () => {
		const result = getDashboardPercentage(0)
		expect(result.trend).toBe('neutral')
		expect(result.color).toBe('text-muted-foreground')
	})
})

describe('getCollectionRateStatus', () => {
	it('returns Excellent for rate >= 95', () => {
		expect(getCollectionRateStatus(95).status).toBe('Excellent')
		expect(getCollectionRateStatus(100).status).toBe('Excellent')
	})
	it('returns Good for rate >= 85 and < 95', () => {
		expect(getCollectionRateStatus(85).status).toBe('Good')
		expect(getCollectionRateStatus(94).status).toBe('Good')
	})
	it('returns Fair for rate >= 70 and < 85', () => {
		expect(getCollectionRateStatus(70).status).toBe('Fair')
		expect(getCollectionRateStatus(84).status).toBe('Fair')
	})
	it('returns Poor for rate < 70', () => {
		expect(getCollectionRateStatus(69).status).toBe('Poor')
		expect(getCollectionRateStatus(0).status).toBe('Poor')
	})
	it('returns correct colors', () => {
		expect(getCollectionRateStatus(95).color).toBe('text-success')
		expect(getCollectionRateStatus(85).color).toBe('text-info')
		expect(getCollectionRateStatus(70).color).toBe('text-warning')
		expect(getCollectionRateStatus(50).color).toBe('text-destructive')
	})
})
