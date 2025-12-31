/**
 * AnimatedTrendIndicator Component Tests
 *
 * Tests for the trend indicator component used in property cards
 * and dashboard metrics to show revenue changes, occupancy trends, etc.
 *
 * @jest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { AnimatedTrendIndicator } from '../animated-trend-indicator'

describe('AnimatedTrendIndicator', () => {
	describe('Value Display', () => {
		it('should display positive value with percentage by default', () => {
			render(<AnimatedTrendIndicator value={12.5} />)

			expect(screen.getByText('12.5%')).toBeInTheDocument()
		})

		it('should display negative value as absolute with percentage', () => {
			render(<AnimatedTrendIndicator value={-8.3} />)

			expect(screen.getByText('8.3%')).toBeInTheDocument()
		})

		it('should display zero value with percentage', () => {
			render(<AnimatedTrendIndicator value={0} />)

			expect(screen.getByText('0.0%')).toBeInTheDocument()
		})

		it('should format value without percentage when showPercentage is false', () => {
			render(<AnimatedTrendIndicator value={1234} showPercentage={false} />)

			expect(screen.getByText('1,234')).toBeInTheDocument()
		})

		it('should hide value when showValue is false', () => {
			render(<AnimatedTrendIndicator value={15.5} showValue={false} />)

			expect(screen.queryByText('15.5%')).not.toBeInTheDocument()
		})

		it('should round to one decimal place', () => {
			render(<AnimatedTrendIndicator value={12.567} />)

			expect(screen.getByText('12.6%')).toBeInTheDocument()
		})
	})

	describe('Icon Selection', () => {
		it('should render ArrowUpRight icon for positive values', () => {
			const { container } = render(<AnimatedTrendIndicator value={5} />)

			// ArrowUpRight icon should be present (Lucide icons render as SVG)
			const svg = container.querySelector('svg')
			expect(svg).toBeInTheDocument()
		})

		it('should render ArrowDownRight icon for negative values', () => {
			const { container } = render(<AnimatedTrendIndicator value={-5} />)

			const svg = container.querySelector('svg')
			expect(svg).toBeInTheDocument()
		})

		it('should render Minus icon for zero value', () => {
			const { container } = render(<AnimatedTrendIndicator value={0} />)

			const svg = container.querySelector('svg')
			expect(svg).toBeInTheDocument()
		})
	})

	describe('Color Classes', () => {
		it('should apply success color for positive values', () => {
			const { container } = render(<AnimatedTrendIndicator value={10} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-success')
		})

		it('should apply destructive color for negative values', () => {
			const { container } = render(<AnimatedTrendIndicator value={-10} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-destructive')
		})

		it('should apply muted-foreground color for zero value', () => {
			const { container } = render(<AnimatedTrendIndicator value={0} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-muted-foreground')
		})
	})

	describe('Size Variants', () => {
		it('should apply small size classes by default', () => {
			const { container } = render(<AnimatedTrendIndicator value={5} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-xs')

			const svg = container.querySelector('svg')
			expect(svg).toHaveClass('size-3')
		})

		it('should apply medium size classes when size is md', () => {
			const { container } = render(
				<AnimatedTrendIndicator value={5} size="md" />
			)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-sm')

			const svg = container.querySelector('svg')
			expect(svg).toHaveClass('size-4')
		})

		it('should apply large size classes when size is lg', () => {
			const { container } = render(
				<AnimatedTrendIndicator value={5} size="lg" />
			)

			const span = container.querySelector('span')
			expect(span).toHaveClass('text-base')

			const svg = container.querySelector('svg')
			expect(svg).toHaveClass('size-5')
		})
	})

	describe('Animation Classes', () => {
		it('should apply slide-in-from-bottom animation for positive values', () => {
			const { container } = render(<AnimatedTrendIndicator value={5} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('animate-in')
			expect(span).toHaveClass('slide-in-from-bottom-1')
		})

		it('should apply slide-in-from-top animation for negative values', () => {
			const { container } = render(<AnimatedTrendIndicator value={-5} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('animate-in')
			expect(span).toHaveClass('slide-in-from-top-1')
		})

		it('should apply fade-in animation for zero value', () => {
			const { container } = render(<AnimatedTrendIndicator value={0} />)

			const span = container.querySelector('span')
			expect(span).toHaveClass('animate-in')
			expect(span).toHaveClass('fade-in')
		})

		it('should apply animation delay when provided', () => {
			const { container } = render(
				<AnimatedTrendIndicator value={5} delay={100} />
			)

			const span = container.querySelector('span')
			expect(span).toHaveStyle({ animationDelay: '100ms' })
		})

		it('should have zero delay by default', () => {
			const { container } = render(<AnimatedTrendIndicator value={5} />)

			const span = container.querySelector('span')
			expect(span).toHaveStyle({ animationDelay: '0ms' })
		})
	})

	describe('Accessibility', () => {
		it('should have aria-label for positive value', () => {
			render(<AnimatedTrendIndicator value={12.5} />)

			const element = screen.getByLabelText('Increased by 12.5%')
			expect(element).toBeInTheDocument()
		})

		it('should have aria-label for negative value', () => {
			render(<AnimatedTrendIndicator value={-8.3} />)

			const element = screen.getByLabelText('Decreased by 8.3%')
			expect(element).toBeInTheDocument()
		})

		it('should have aria-label for zero value', () => {
			render(<AnimatedTrendIndicator value={0} />)

			const element = screen.getByLabelText('No change by 0.0%')
			expect(element).toBeInTheDocument()
		})

		it('should have aria-label with formatted number when not percentage', () => {
			render(<AnimatedTrendIndicator value={1500} showPercentage={false} />)

			const element = screen.getByLabelText('Increased by 1,500')
			expect(element).toBeInTheDocument()
		})
	})

	describe('Custom Styling', () => {
		it('should apply custom className', () => {
			const { container } = render(
				<AnimatedTrendIndicator value={5} className="custom-class" />
			)

			const span = container.querySelector('span')
			expect(span).toHaveClass('custom-class')
		})

		it('should merge custom className with default classes', () => {
			const { container } = render(
				<AnimatedTrendIndicator value={5} className="my-custom-class" />
			)

			const span = container.querySelector('span')
			expect(span).toHaveClass('my-custom-class')
			expect(span).toHaveClass('text-success')
			expect(span).toHaveClass('inline-flex')
		})
	})

	describe('Edge Cases', () => {
		it('should handle very small positive values', () => {
			render(<AnimatedTrendIndicator value={0.01} />)

			expect(screen.getByText('0.0%')).toBeInTheDocument()
			const element = screen.getByLabelText('Increased by 0.0%')
			expect(element).toHaveClass('text-success')
		})

		it('should handle very small negative values', () => {
			render(<AnimatedTrendIndicator value={-0.01} />)

			expect(screen.getByText('0.0%')).toBeInTheDocument()
			const element = screen.getByLabelText('Decreased by 0.0%')
			expect(element).toHaveClass('text-destructive')
		})

		it('should handle large values', () => {
			render(<AnimatedTrendIndicator value={999.99} />)

			expect(screen.getByText('1000.0%')).toBeInTheDocument()
		})

		it('should handle large negative values', () => {
			render(<AnimatedTrendIndicator value={-500.5} />)

			expect(screen.getByText('500.5%')).toBeInTheDocument()
		})

		it('should handle decimal precision correctly', () => {
			render(<AnimatedTrendIndicator value={33.333} />)

			expect(screen.getByText('33.3%')).toBeInTheDocument()
		})
	})
})
