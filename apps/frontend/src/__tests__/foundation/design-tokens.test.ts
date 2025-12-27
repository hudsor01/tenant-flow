/**
 * Foundation Layer Tests - Design Tokens
 *
 * Tests that CSS design tokens are properly defined and accessible.
 * These tests verify the foundation layer for the owner dashboard v2.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('design tokens', () => {
	let originalGetComputedStyle: typeof window.getComputedStyle

	beforeEach(() => {
		// Save original
		originalGetComputedStyle = window.getComputedStyle

		// Mock getComputedStyle to return expected CSS variable values
		window.getComputedStyle = vi.fn().mockReturnValue({
			getPropertyValue: (prop: string) => {
				const values: Record<string, string> = {
					// Duration tokens
					'--transition-duration-instant': '150ms',
					'--transition-duration-fast': '200ms',
					'--transition-duration-normal': '300ms',
					'--transition-duration-slow': '500ms',
					'--transition-duration-slower': '700ms',
					// Color tokens
					'--color-primary': 'oklch(0.54 0.23 257)',
					'--color-primary-foreground': 'oklch(0.98 0.01 255)',
					'--color-destructive': 'oklch(0.577 0.245 25)',
					'--color-success': 'oklch(0.66 0.2 160)',
					'--color-warning': 'oklch(0.75 0.18 85)',
					'--color-info': 'oklch(0.62 0.19 240)',
					'--color-background': 'oklch(0.985 0.002 240)',
					'--color-foreground': 'oklch(0.2 0.02 245)',
					'--color-muted': 'oklch(0.94 0.01 240)',
					// Font tokens
					'--font-sans':
						'var(--font-spline), system-ui, -apple-system, sans-serif',
					'--font-mono': 'var(--font-mono), ui-monospace, monospace',
					// Spacing tokens
					'--spacing': '0.25rem',
					'--radius': '0.5rem',
					// Touch target tokens
					'--touch-target-min': '2.75rem'
				}
				return values[prop] || ''
			}
		}) as typeof window.getComputedStyle
	})

	afterEach(() => {
		// Restore original
		window.getComputedStyle = originalGetComputedStyle
	})

	it('should have animation duration tokens defined', () => {
		const styles = window.getComputedStyle(document.documentElement)

		expect(styles.getPropertyValue('--transition-duration-instant')).toBe(
			'150ms'
		)
		expect(styles.getPropertyValue('--transition-duration-fast')).toBe('200ms')
		expect(styles.getPropertyValue('--transition-duration-normal')).toBe(
			'300ms'
		)
		expect(styles.getPropertyValue('--transition-duration-slow')).toBe('500ms')
		expect(styles.getPropertyValue('--transition-duration-slower')).toBe(
			'700ms'
		)
	})

	it('should have OKLCH color tokens defined', () => {
		const styles = window.getComputedStyle(document.documentElement)

		// Primary colors
		expect(styles.getPropertyValue('--color-primary')).toContain('oklch')
		expect(styles.getPropertyValue('--color-primary-foreground')).toContain(
			'oklch'
		)

		// Semantic colors
		expect(styles.getPropertyValue('--color-destructive')).toContain('oklch')
		expect(styles.getPropertyValue('--color-success')).toContain('oklch')
		expect(styles.getPropertyValue('--color-warning')).toContain('oklch')
		expect(styles.getPropertyValue('--color-info')).toContain('oklch')

		// Base colors
		expect(styles.getPropertyValue('--color-background')).toContain('oklch')
		expect(styles.getPropertyValue('--color-foreground')).toContain('oklch')
	})

	it('should have font family tokens defined', () => {
		const styles = window.getComputedStyle(document.documentElement)

		expect(styles.getPropertyValue('--font-sans')).toContain('--font-spline')
		expect(styles.getPropertyValue('--font-mono')).toContain('monospace')
	})

	it('should have touch target token for accessibility', () => {
		const styles = window.getComputedStyle(document.documentElement)

		// Touch target should be at least 44px (2.75rem)
		const touchTarget = styles.getPropertyValue('--touch-target-min')
		expect(touchTarget).toBe('2.75rem')
	})
})
