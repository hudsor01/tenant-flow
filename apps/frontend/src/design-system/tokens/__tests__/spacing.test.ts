/**
 * Spacing Utility Tests
 *
 * Test Driven Development for spacing system improvements
 * Ensures consistent spacing tokens and layout utilities
 */

import { describe, expect, it } from 'vitest'
import { spacing, layout } from '#design-system/tokens/unified'

describe('Spacing System', () => {
	describe('Spacing Tokens', () => {
		it('should have consistent spacing scale', () => {
			expect(spacing).toHaveProperty('1')
			expect(spacing).toHaveProperty('4')
			expect(spacing).toHaveProperty('8')
			expect(spacing).toHaveProperty('16')
			expect(spacing).toHaveProperty('20')
			expect(spacing).toHaveProperty('24')
		})

		it('should have proper spacing values', () => {
			expect(spacing['4']).toBe('1rem')
			expect(spacing['8']).toBe('2rem')
			expect(spacing['16']).toBe('4rem')
		})
	})

	describe('Layout Tokens', () => {
		it('should have section spacing utilities', () => {
			expect(layout.section).toHaveProperty('paddingY')
			expect(layout.section.paddingY).toBe('5rem')
		})

		it('should have responsive container padding', () => {
			expect(layout.container).toHaveProperty('paddingX')
			expect(layout.container.paddingX).toBe('clamp(1.5rem, 4vw, 3rem)')
		})

		it('should have content block spacing', () => {
			expect(layout.content).toHaveProperty('padding')
			expect(layout.content.padding).toBe('2rem')
		})
	})

	describe('Semantic Spacing', () => {
		it('should provide consistent section spacing', () => {
			expect(layout.section.paddingY).toBe('5rem')
			expect(layout.section.paddingYCompact).toBe('3rem')
			expect(layout.section.paddingYSpacious).toBe('6rem')
		})

		it('should provide consistent group spacing', () => {
			expect(layout.gap.group).toBe('2rem')
			expect(layout.gap.items).toBe('1rem')
		})

		it('should provide consistent stack spacing', () => {
			expect(layout.stack.default).toBe('1.5rem')
			expect(layout.stack.tight).toBe('0.75rem')
			expect(layout.stack.loose).toBe('3rem')
		})
	})
})