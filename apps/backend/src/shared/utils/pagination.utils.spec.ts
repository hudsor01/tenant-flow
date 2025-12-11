import {
	validateLimit,
	DEFAULT_PAGINATION_LIMIT,
	MAX_PAGINATION_LIMIT
} from './pagination.utils'

describe('pagination.utils', () => {
	describe('validateLimit', () => {
		it('returns default when limit is undefined', () => {
			expect(validateLimit(undefined)).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('returns default when limit is empty string', () => {
			expect(validateLimit('')).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('parses valid numeric string', () => {
			expect(validateLimit('50')).toBe(50)
		})

		it('clamps limit to MAX_PAGINATION_LIMIT (100)', () => {
			expect(validateLimit('500')).toBe(MAX_PAGINATION_LIMIT)
		})

		it('returns default for non-numeric string', () => {
			expect(validateLimit('abc')).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('returns default for negative number string', () => {
			expect(validateLimit('-5')).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('returns default for decimal string', () => {
			expect(validateLimit('10.5')).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('trims whitespace and parses valid number', () => {
			expect(validateLimit(' 50 ')).toBe(50)
		})

		it('returns default for whitespace-only string', () => {
			expect(validateLimit('   ')).toBe(DEFAULT_PAGINATION_LIMIT)
		})

		it('returns 1 for zero', () => {
			expect(validateLimit('0')).toBe(1)
		})

		it('handles boundary value of 1', () => {
			expect(validateLimit('1')).toBe(1)
		})

		it('handles boundary value of 100', () => {
			expect(validateLimit('100')).toBe(MAX_PAGINATION_LIMIT)
		})
	})
})
