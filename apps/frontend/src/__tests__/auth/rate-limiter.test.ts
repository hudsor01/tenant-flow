import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
	loginRateLimiter,
	signupRateLimiter,
	passwordResetRateLimiter,
	clearRateLimit,
	getRateLimitStatus
} from '@/lib/auth/rate-limiter'

// Mock headers
vi.mock('next/headers', () => ({
	headers: vi.fn(() => ({
		get: vi.fn((header: string) => {
			if (header === 'x-forwarded-for') return '192.168.1.1'
			return null
		})
	}))
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
	logger: {
		debug: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}))

describe('Rate Limiter', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset rate limit state between tests
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('loginRateLimiter', () => {
		it('should allow 5 login attempts within 15 minutes', async () => {
			const email = 'test@example.com'

			// First 5 attempts should succeed
			for (let i = 0; i < 5; i++) {
				const result = await loginRateLimiter(email)
				expect(result.success).toBe(true)
				expect(result.remaining).toBe(4 - i)
			}

			// 6th attempt should fail
			const result = await loginRateLimiter(email)
			expect(result.success).toBe(false)
			expect(result.remaining).toBe(0)
			expect(result.reason).toContain('Account locked')
		})

		it('should reset after 15 minutes', async () => {
			const email = 'test@example.com'

			// Use up all attempts
			for (let i = 0; i < 5; i++) {
				await loginRateLimiter(email)
			}

			// Should be locked out
			let result = await loginRateLimiter(email)
			expect(result.success).toBe(false)

			// Fast forward 15 minutes and 1 second
			vi.advanceTimersByTime(15 * 60 * 1000 + 1000)

			// Should be allowed again
			result = await loginRateLimiter(email)
			expect(result.success).toBe(true)
			expect(result.remaining).toBe(4)
		})

		it('should track different emails separately', async () => {
			const email1 = 'user1@example.com'
			const email2 = 'user2@example.com'

			// Use up attempts for email1
			for (let i = 0; i < 5; i++) {
				await loginRateLimiter(email1)
			}

			// email1 should be locked
			let result = await loginRateLimiter(email1)
			expect(result.success).toBe(false)

			// email2 should still be allowed
			result = await loginRateLimiter(email2)
			expect(result.success).toBe(true)
			expect(result.remaining).toBe(4)
		})
	})

	describe('signupRateLimiter', () => {
		it('should allow 3 signup attempts per hour', async () => {
			// First 3 attempts should succeed
			for (let i = 0; i < 3; i++) {
				const result = await signupRateLimiter()
				expect(result.success).toBe(true)
				expect(result.remaining).toBe(2 - i)
			}

			// 4th attempt should fail
			const result = await signupRateLimiter()
			expect(result.success).toBe(false)
			expect(result.remaining).toBe(0)
		})

		it('should reset after 1 hour', async () => {
			// Use up all attempts
			for (let i = 0; i < 3; i++) {
				await signupRateLimiter()
			}

			// Should be rate limited
			let result = await signupRateLimiter()
			expect(result.success).toBe(false)

			// Fast forward 1 hour and 1 second
			vi.advanceTimersByTime(60 * 60 * 1000 + 1000)

			// Should be allowed again
			result = await signupRateLimiter()
			expect(result.success).toBe(true)
			expect(result.remaining).toBe(2)
		})
	})

	describe('passwordResetRateLimiter', () => {
		it('should allow 3 reset attempts per hour per email', async () => {
			const email = 'test@example.com'

			// First 3 attempts should succeed
			for (let i = 0; i < 3; i++) {
				const result = await passwordResetRateLimiter(email)
				expect(result.success).toBe(true)
				expect(result.remaining).toBe(2 - i)
			}

			// 4th attempt should fail
			const result = await passwordResetRateLimiter(email)
			expect(result.success).toBe(false)
			expect(result.remaining).toBe(0)
		})
	})

	describe('clearRateLimit', () => {
		it('should clear rate limit for specific email', async () => {
			const email = 'test@example.com'

			// Use up all attempts
			for (let i = 0; i < 5; i++) {
				await loginRateLimiter(email)
			}

			// Should be locked out
			let result = await loginRateLimiter(email)
			expect(result.success).toBe(false)

			// Clear rate limit
			await clearRateLimit(email)

			// Should be allowed again
			result = await loginRateLimiter(email)
			expect(result.success).toBe(true)
			expect(result.remaining).toBe(4)
		})
	})

	describe('getRateLimitStatus', () => {
		it('should return current rate limit status without incrementing', async () => {
			const email = 'test@example.com'

			// Check initial status
			let status = await getRateLimitStatus(email)
			expect(status.success).toBe(true)
			expect(status.remaining).toBe(5)

			// Use one attempt
			await loginRateLimiter(email)

			// Check status again
			status = await getRateLimitStatus(email)
			expect(status.success).toBe(true)
			expect(status.remaining).toBe(4)

			// Check status doesn't increment counter
			status = await getRateLimitStatus(email)
			expect(status.remaining).toBe(4)
		})
	})
})
