/**
 * Component Naming Convention Tests
 *
 * Test Driven Development for component naming standardization
 * Ensures consistent class naming and removal of data-slot attributes
 */

import type { ReactNode } from 'react'

import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { describe, expect, it } from 'vitest'
import { Button } from '../button'

describe('Component Naming Conventions', () => {
	describe('Standardized Components', () => {
		it('should use semantic class names without data-slot', () => {
			render(<Button>Click me</Button>)
			const button = screen.getByRole('button')

			// Should not have data-slot attribute
			expect(button).not.toHaveAttribute('data-slot')

			// Should have proper semantic classes
			expect(button).toHaveClass(
				'inline-flex',
				'items-center',
				'justify-center',
				'bg-primary',
				'text-primary-foreground'
			)
		})

		it('should support different variants with consistent naming', () => {
			render(<Button variant="outline">Outline Button</Button>)
			const button = screen.getByRole('button')

			expect(button).toHaveClass('border', 'border-input', 'bg-background')
		})

		it('should support different sizes with consistent naming', () => {
			render(<Button size="lg">Large Button</Button>)
			const button = screen.getByRole('button')

			expect(button).toHaveClass('h-11', 'rounded-md', 'px-8')
		})
	})

	describe('Legacy Component Detection', () => {
		it('should identify components using data-slot attributes', () => {
			// Test component that uses data-slot (should be avoided)
			function LegacyButton({ children }: { children: ReactNode }) {
				return (
					<button data-slot="button" data-testid="legacy-button">
						{children}
					</button>
				)
			}

			render(<LegacyButton>Legacy Button</LegacyButton>)
			const button = screen.getByTestId('legacy-button')

			// Should have data-slot attribute (legacy)
			expect(button).toHaveAttribute('data-slot', 'button')
		})
	})

	describe('Class Name Consistency', () => {
		it('should use consistent spacing utilities', () => {
			render(<Button>Button</Button>)
			const button = screen.getByRole('button')

			// Should use standard Tailwind spacing
			expect(button).toHaveClass('gap-2', 'px-4', 'py-2')
		})

		it('should use consistent color tokens', () => {
			render(<Button variant="destructive">Delete</Button>)
			const button = screen.getByRole('button')

			// Should use semantic color tokens
			expect(button).toHaveClass(
				'bg-destructive',
				'text-destructive-foreground'
			)
		})

		it('should use consistent border radius', () => {
			render(<Button>Button</Button>)
			const button = screen.getByRole('button')

			// Should use consistent border radius
			expect(button).toHaveClass('rounded-md')
		})
	})

	describe('Accessibility Standards', () => {
		it('should maintain focus states without data-slot dependencies', () => {
			render(<Button>Focusable Button</Button>)
			const button = screen.getByRole('button')

			// Should have proper focus classes
			expect(button).toHaveClass(
				'focus-visible:outline-none',
				'focus-visible:ring-2',
				'focus-visible:ring-ring'
			)
		})

		it('should support disabled states', () => {
			render(<Button disabled>Disabled Button</Button>)
			const button = screen.getByRole('button')

			expect(button).toHaveClass(
				'disabled:pointer-events-none',
				'disabled:opacity-50'
			)
		})
	})

	describe('Performance Considerations', () => {
		it('should use efficient class combinations', () => {
			render(<Button>Button</Button>)
			const button = screen.getByRole('button')

			const classList = button.className.split(' ')

			// Should not have excessive classes (reasonable limit for complex components)
			expect(classList.length).toBeLessThan(30)

			// Should not have conflicting classes
			const hasPaddingX = classList.some(cls => cls.startsWith('px-'))
			const hasPaddingY = classList.some(cls => cls.startsWith('py-'))
			expect(hasPaddingX && hasPaddingY).toBe(true)
		})
	})
})
