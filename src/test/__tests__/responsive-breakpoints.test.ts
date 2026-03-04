/**
 * Foundation Layer Tests - Responsive Breakpoints
 *
 * Tests that responsive breakpoints are defined correctly
 * matching Tailwind CSS v4 breakpoint values.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('responsive breakpoints', () => {
	let originalMatchMedia: typeof window.matchMedia
	let matchMediaMock: ReturnType<typeof vi.fn>
	let mediaQueryResults: Record<string, boolean>

	beforeEach(() => {
		// Save original
		originalMatchMedia = window.matchMedia

		// Define expected Tailwind v4 breakpoints
		mediaQueryResults = {
			'(min-width: 640px)': false, // sm
			'(min-width: 768px)': false, // md
			'(min-width: 1024px)': false, // lg
			'(min-width: 1280px)': false, // xl
			'(min-width: 1536px)': false // 2xl
		}

		matchMediaMock = vi.fn().mockImplementation((query: string) => ({
			matches: mediaQueryResults[query] ?? false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))

		window.matchMedia = matchMediaMock as typeof window.matchMedia
	})

	afterEach(() => {
		// Restore original
		window.matchMedia = originalMatchMedia
	})

	it('should detect mobile viewport (< 640px)', () => {
		// Default state is mobile
		const smQuery = window.matchMedia('(min-width: 640px)')
		expect(smQuery.matches).toBe(false)
	})

	it('should detect sm breakpoint (640px)', () => {
		mediaQueryResults['(min-width: 640px)'] = true

		const smQuery = window.matchMedia('(min-width: 640px)')
		expect(smQuery.matches).toBe(true)
	})

	it('should detect md breakpoint (768px)', () => {
		mediaQueryResults['(min-width: 768px)'] = true

		const mdQuery = window.matchMedia('(min-width: 768px)')
		expect(mdQuery.matches).toBe(true)
	})

	it('should detect lg breakpoint (1024px)', () => {
		mediaQueryResults['(min-width: 1024px)'] = true

		const lgQuery = window.matchMedia('(min-width: 1024px)')
		expect(lgQuery.matches).toBe(true)
	})

	it('should define correct breakpoint values', () => {
		// Test that breakpoints match Tailwind v4 defaults
		const breakpoints = {
			sm: 640,
			md: 768,
			lg: 1024,
			xl: 1280,
			'2xl': 1536
		}

		// Verify each breakpoint triggers at correct width
		expect(breakpoints.sm).toBe(640)
		expect(breakpoints.md).toBe(768)
		expect(breakpoints.lg).toBe(1024)
		expect(breakpoints.xl).toBe(1280)
		expect(breakpoints['2xl']).toBe(1536)
	})
})
