/**
 * Example Vitest Test
 *
 * This test verifies the Vitest setup is working correctly.
 * Remove or replace this file with actual tests once verified.
 */

import { describe, it, expect } from 'vitest'

describe('Vitest Setup', () => {
	it('should run basic assertions', () => {
		expect(1 + 1).toBe(2)
		expect('hello').toBe('hello')
		expect([1, 2, 3]).toHaveLength(3)
	})

	it('should handle async tests', async () => {
		const promise = Promise.resolve(42)
		await expect(promise).resolves.toBe(42)
	})

	it('should support type checking', () => {
		const user = {
			id: '123',
			name: 'Test User',
			email: 'test@example.com'
		}

		expect(user).toHaveProperty('id')
		expect(user).toHaveProperty('name')
		expect(user).toHaveProperty('email')
		expect(user.email).toMatch(/@/)
	})
})

describe('Environment Configuration', () => {
	it('should have test environment variables', () => {
		expect(process.env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
		expect(process.env.NEXT_PUBLIC_API_BASE_URL).toBe('http://localhost:4600')
		expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
		expect(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe('test-key')
	})

	it('should have jsdom environment', () => {
		expect(typeof window).toBe('object')
		expect(typeof document).toBe('object')
		expect(typeof navigator).toBe('object')
	})
})

describe('Browser API Mocks', () => {
	it('should have matchMedia mock', () => {
		const mediaQuery = window.matchMedia('(min-width: 768px)')
		expect(mediaQuery).toBeDefined()
		expect(mediaQuery.matches).toBe(false)
	})

	it('should have IntersectionObserver available', () => {
		expect(typeof IntersectionObserver).toBe('function')
	})

	it('should have ResizeObserver available', () => {
		expect(typeof ResizeObserver).toBe('function')
	})
})
