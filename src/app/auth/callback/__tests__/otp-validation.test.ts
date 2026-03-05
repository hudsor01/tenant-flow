import { describe, expect, it } from 'vitest'

import { isValidOtpType, VALID_OTP_TYPES } from '../route'

describe('isValidOtpType', () => {
	it('accepts "signup" as valid', () => {
		expect(isValidOtpType('signup')).toBe(true)
	})

	it('accepts "email" as valid', () => {
		expect(isValidOtpType('email')).toBe(true)
	})

	it('accepts "recovery" as valid', () => {
		expect(isValidOtpType('recovery')).toBe(true)
	})

	it('accepts "magiclink" as valid', () => {
		expect(isValidOtpType('magiclink')).toBe(true)
	})

	it('accepts "invite" as valid', () => {
		expect(isValidOtpType('invite')).toBe(true)
	})

	it('rejects "faketype" as invalid', () => {
		expect(isValidOtpType('faketype')).toBe(false)
	})

	it('rejects null as invalid', () => {
		expect(isValidOtpType(null)).toBe(false)
	})

	it('rejects empty string as invalid', () => {
		expect(isValidOtpType('')).toBe(false)
	})
})

describe('VALID_OTP_TYPES', () => {
	it('contains exactly 5 types', () => {
		expect(VALID_OTP_TYPES).toHaveLength(5)
	})

	it('includes all expected types', () => {
		expect(VALID_OTP_TYPES).toContain('signup')
		expect(VALID_OTP_TYPES).toContain('email')
		expect(VALID_OTP_TYPES).toContain('recovery')
		expect(VALID_OTP_TYPES).toContain('magiclink')
		expect(VALID_OTP_TYPES).toContain('invite')
	})
})
