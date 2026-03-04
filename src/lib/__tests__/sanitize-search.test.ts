import { describe, it, expect } from 'vitest'
import { sanitizeSearchInput } from '#lib/sanitize-search'

describe('sanitizeSearchInput', () => {
	it('returns simple text unchanged', () => {
		expect(sanitizeSearchInput('hello world')).toBe('hello world')
	})

	it('strips commas', () => {
		expect(sanitizeSearchInput('a,b,c')).toBe('abc')
	})

	it('strips dots', () => {
		expect(sanitizeSearchInput('name.eq.value')).toBe('nameeqvalue')
	})

	it('strips parentheses', () => {
		expect(sanitizeSearchInput('test(injection)')).toBe('testinjection')
	})

	it('strips single quotes', () => {
		expect(sanitizeSearchInput("it's")).toBe('its')
	})

	it('strips double quotes', () => {
		expect(sanitizeSearchInput('"quoted"')).toBe('quoted')
	})

	it('strips backslashes', () => {
		expect(sanitizeSearchInput('path\\escape')).toBe('pathescape')
	})

	it('preserves percent signs (ILIKE wildcard)', () => {
		expect(sanitizeSearchInput('100%')).toBe('100%')
	})

	it('preserves hyphens, spaces, and alphanumerics', () => {
		expect(sanitizeSearchInput('123 Main St - Apt 4B')).toBe('123 Main St - Apt 4B')
	})

	it('trims whitespace', () => {
		expect(sanitizeSearchInput('  hello  ')).toBe('hello')
	})

	it('enforces 100-character max length', () => {
		const longInput = 'a'.repeat(150)
		expect(sanitizeSearchInput(longInput)).toHaveLength(100)
	})

	it('strips dangerous PostgREST injection payload', () => {
		// Attack vector: break out of ilike filter and add additional filter
		const injection = '%,owner_user_id.neq.00000000'
		const result = sanitizeSearchInput(injection)
		expect(result).not.toContain(',')
		expect(result).not.toContain('.')
		expect(result).toBe('%owner_user_idneq00000000')
	})

	it('returns empty string for empty input', () => {
		expect(sanitizeSearchInput('')).toBe('')
	})

	it('returns empty string when input is only dangerous chars', () => {
		expect(sanitizeSearchInput(',.()"\\\'')).toBe('')
	})
})
