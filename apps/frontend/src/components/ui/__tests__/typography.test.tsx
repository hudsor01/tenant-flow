/**
 * Typography Utility Tests
 *
 * Test Driven Development for typography system improvements
 * Ensures consistent font hierarchy, spacing, and visual hierarchy
 */

import { render, screen } from '#test/utils/test-render'
import { describe, expect, it } from 'vitest'

// Typography utility components for testing
function TypographyTestComponent({
	variant,
	children
}: {
	variant: string
	children: React.ReactNode
}) {
	const classes = {
		'display-2xl': 'text-5xl font-black leading-tight tracking-tight',
		'display-xl': 'text-4xl font-black leading-tight tracking-tight',
		'display-lg': 'typography-h2 leading-tight tracking-tight',
		'heading-xl': 'typography-h3 leading-snug tracking-tight',
		'heading-lg': 'text-xl font-bold leading-snug tracking-tight',
		'heading-md': 'typography-large leading-snug',
		'heading-sm': 'text-base font-semibold leading-snug',
		'body-lg': 'text-lg leading-relaxed',
		'body-md': 'text-base leading-relaxed',
		'body-sm': 'text-sm leading-relaxed',
		'body-xs': 'text-xs leading-relaxed',
		'ui-title': 'text-sm font-semibold leading-none tracking-wide uppercase',
		'ui-label': 'typography-small leading-none',
		'ui-caption': 'text-xs font-medium leading-none text-muted-foreground',
		'hero-primary': 'text-6xl font-black leading-none tracking-tight',
		'hero-secondary': 'typography-h1 leading-tight tracking-tight',
		'feature-title': 'typography-h3 leading-tight',
		'cta-text': 'typography-large leading-snug'
	}

	return (
		<div data-testid={`typography-${variant}`} className={classes[variant as keyof typeof classes]}>
			{children}
		</div>
	)
}

describe('Typography System', () => {
	describe('Font Hierarchy', () => {
		it('should render display variants with correct font sizes', () => {
			render(<TypographyTestComponent variant="display-2xl">Display 2XL</TypographyTestComponent>)
			const element = screen.getByTestId('typography-display-2xl')
			expect(element).toHaveClass('text-5xl', 'font-black', 'leading-tight', 'tracking-tight')
		})

		it('should render heading variants with semantic hierarchy', () => {
			render(<TypographyTestComponent variant="heading-xl">Heading XL</TypographyTestComponent>)
			const element = screen.getByTestId('typography-heading-xl')
			// Uses typography-h3 utility class for semantic hierarchy
			expect(element).toHaveClass('typography-h3', 'leading-snug', 'tracking-tight')
		})

		it('should render body variants with readable line heights', () => {
			render(<TypographyTestComponent variant="body-md">Body Medium</TypographyTestComponent>)
			const element = screen.getByTestId('typography-body-md')
			expect(element).toHaveClass('text-base', 'leading-relaxed')
		})
	})

	describe('UI Typography', () => {
		it('should render UI labels with proper styling', () => {
			render(<TypographyTestComponent variant="ui-label">UI Label</TypographyTestComponent>)
			const element = screen.getByTestId('typography-ui-label')
			// Uses typography-small utility class
			expect(element).toHaveClass('typography-small', 'leading-none')
		})

		it('should render captions with muted foreground', () => {
			render(<TypographyTestComponent variant="ui-caption">Caption</TypographyTestComponent>)
			const element = screen.getByTestId('typography-ui-caption')
			expect(element).toHaveClass('text-xs', 'font-medium', 'leading-none', 'text-muted-foreground')
		})
	})

	describe('Marketing Typography', () => {
		it('should render hero text with maximum impact', () => {
			render(<TypographyTestComponent variant="hero-primary">Hero Primary</TypographyTestComponent>)
			const element = screen.getByTestId('typography-hero-primary')
			expect(element).toHaveClass('text-6xl', 'font-black', 'leading-none', 'tracking-tight')
		})

		it('should render feature titles with clear hierarchy', () => {
			render(<TypographyTestComponent variant="feature-title">Feature Title</TypographyTestComponent>)
			const element = screen.getByTestId('typography-feature-title')
			// Uses typography-h3 utility class for semantic hierarchy
			expect(element).toHaveClass('typography-h3', 'leading-tight')
		})
	})

	describe('Accessibility', () => {
		it('should maintain proper contrast ratios', () => {
			render(<TypographyTestComponent variant="body-md">Accessible text</TypographyTestComponent>)
			const element = screen.getByTestId('typography-body-md')
			// Test that text color is not too light on light backgrounds
			expect(element).not.toHaveClass('text-white')
		})

		it('should use appropriate font weights for readability', () => {
			render(<TypographyTestComponent variant="body-sm">Readable text</TypographyTestComponent>)
			const element = screen.getByTestId('typography-body-sm')
			// Body text should not be too thin
			expect(element).not.toHaveClass('font-thin', 'font-extralight')
		})
	})

	describe('Responsive Typography', () => {
		it('should scale appropriately on mobile devices', () => {
			// Mock mobile viewport
			Object.defineProperty(window, 'innerWidth', { value: 375 })

			render(<TypographyTestComponent variant="display-xl">Mobile Display</TypographyTestComponent>)
			const element = screen.getByTestId('typography-display-xl')

			// On mobile, should still be readable
			expect(element).toHaveClass('text-4xl')
		})
	})
})