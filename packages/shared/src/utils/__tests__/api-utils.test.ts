/**
 * Unit Tests for API Utils
 * Tests URL construction logic across different environments
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getApiBaseUrl } from '../api-utils'

describe('getApiBaseUrl', () => {
	const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined
	const originalWindow = global.window as typeof globalThis.window | undefined

	beforeEach(() => {
		// Reset environment before each test
		delete process.env.NEXT_PUBLIC_API_BASE_URL
	})

	afterEach(() => {
		// Restore original values
		if (originalEnv !== undefined) {
			process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv
		} else {
			delete process.env.NEXT_PUBLIC_API_BASE_URL
		}
		// Properly restore window global
		if (originalWindow !== undefined) {
			global.window = originalWindow
		} else {
			// @ts-expect-error - intentionally setting to undefined for server environment test
			global.window = undefined
		}
	})

	describe('Explicit Environment Variable', () => {
		it('should return absolute URL with /api as-is', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app/api/v1'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api/v1')
		})

		it('should append /api/v1 to absolute URL without /api', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api/v1')
		})

		it('should handle absolute URL with just /api (no version)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app/api'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api')
		})

		it('should remove trailing slash from absolute URL', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app/'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api/v1')
		})

		it('should remove trailing slash from URL with /api', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL =
				'https://api.tenantflow.app/api/v1/'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api/v1')
		})

		it('should handle relative URL starting with /api', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = '/api/v1'
			expect(getApiBaseUrl()).toBe('/api/v1')
		})

		it('should handle relative URL starting with /api (no version)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = '/api'
			expect(getApiBaseUrl()).toBe('/api')
		})

		it('should append /api/v1 to relative URL without /api', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = '/backend'
			expect(getApiBaseUrl()).toBe('/backend/api/v1')
		})

		it('should handle URL with port number', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001'
			expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1')
		})

		it('should handle URL with port and /api', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api/v1'
			expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1')
		})
	})

	describe('Client-Side Fallback (Browser)', () => {
		beforeEach(() => {
			// Mock browser environment - minimal window object
			global.window = {} as typeof globalThis.window
		})

		afterEach(() => {
			if (originalWindow !== undefined) {
				global.window = originalWindow
			} else {
				// @ts-expect-error - intentionally setting to undefined for server environment test
				global.window = undefined
			}
		})

		it('should return /api/v1 when no env var is set', () => {
			delete process.env.NEXT_PUBLIC_API_BASE_URL
			expect(getApiBaseUrl()).toBe('/api/v1')
		})

		it('should use env var if provided (even in browser)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.production.com/api/v1'
			expect(getApiBaseUrl()).toBe('https://api.production.com/api/v1')
		})
	})

	describe('Server-Side Fallback (Node)', () => {
		beforeEach(() => {
			// Ensure we're in server environment (no window)
			// @ts-expect-error - intentionally setting to undefined for server environment test
			global.window = undefined
		})

		it('should return localhost:3001 when no env var is set', () => {
			delete process.env.NEXT_PUBLIC_API_BASE_URL
			expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1')
		})

		it('should use env var if provided (even on server)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.railway.app/api/v1'
			expect(getApiBaseUrl()).toBe('https://api.railway.app/api/v1')
		})
	})

	describe('Edge Cases', () => {
		it('should handle empty string env var (fallback to client/server logic)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = ''
			// In browser: /api/v1, On server: http://localhost:3001/api/v1
			const result = getApiBaseUrl()
			expect(result).toMatch(/^(\/api\/v1|http:\/\/localhost:3001\/api\/v1)$/)
		})

		it('should handle URL with multiple /api in path', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.com/api/api/v1'
			// Should treat it as already having /api
			expect(getApiBaseUrl()).toBe('https://example.com/api/api/v1')
		})

		it('should handle URL with query params (edge case)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com?env=prod'
			// Should still append /api/v1
			expect(getApiBaseUrl()).toBe('https://api.example.com?env=prod/api/v1')
		})

		it('should handle URL with hash (edge case)', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com#section'
			expect(getApiBaseUrl()).toBe('https://api.example.com#section/api/v1')
		})
	})

	describe('Production Scenarios', () => {
		it('should handle Vercel deployment URL', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://tenantflow.app'
			expect(getApiBaseUrl()).toBe('https://tenantflow.app/api/v1')
		})

		it('should handle Railway API URL', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.tenantflow.app/api/v1'
			expect(getApiBaseUrl()).toBe('https://api.tenantflow.app/api/v1')
		})

		it('should handle preview deployment with subdomain', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'https://preview-pr-123.vercel.app'
			expect(getApiBaseUrl()).toBe('https://preview-pr-123.vercel.app/api/v1')
		})

		it('should handle staging environment', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL =
				'https://staging-api.tenantflow.app/api/v1'
			expect(getApiBaseUrl()).toBe('https://staging-api.tenantflow.app/api/v1')
		})
	})

	describe('Development Scenarios', () => {
		it('should handle local dev with explicit localhost', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api/v1'
			expect(getApiBaseUrl()).toBe('http://localhost:3001/api/v1')
		})

		it('should handle local dev with 127.0.0.1', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'http://127.0.0.1:3001'
			expect(getApiBaseUrl()).toBe('http://127.0.0.1:3001/api/v1')
		})

		it('should handle Docker compose service name', () => {
			process.env.NEXT_PUBLIC_API_BASE_URL = 'http://backend:3001'
			expect(getApiBaseUrl()).toBe('http://backend:3001/api/v1')
		})
	})
})
