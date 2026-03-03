import { describe, it, expect, vi } from 'vitest'

// Mock Sentry before importing the module
vi.mock('@sentry/nextjs', () => ({
	captureMessage: vi.fn(),
}))

import { requireOwnerUserId } from '#lib/require-owner-user-id'
import * as Sentry from '@sentry/nextjs'

describe('requireOwnerUserId', () => {
	it('returns userId when defined', () => {
		const result = requireOwnerUserId('abc-123')
		expect(result).toBe('abc-123')
	})

	it('throws with user-facing message when userId is undefined', () => {
		expect(() => requireOwnerUserId(undefined)).toThrow(
			'Unable to save. Please refresh and try again.'
		)
	})

	it('logs Sentry warning when userId is undefined', () => {
		try { requireOwnerUserId(undefined) } catch { /* expected */ }
		expect(Sentry.captureMessage).toHaveBeenCalledWith(
			expect.stringContaining('owner_user_id'),
			expect.objectContaining({ level: 'warning' })
		)
	})

	it('does not log Sentry when userId is defined', () => {
		vi.mocked(Sentry.captureMessage).mockClear()
		requireOwnerUserId('valid-id')
		expect(Sentry.captureMessage).not.toHaveBeenCalled()
	})
})
