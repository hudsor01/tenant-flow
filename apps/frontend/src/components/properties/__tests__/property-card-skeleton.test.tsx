/**
 * PropertyCardSkeleton Component Tests
 *
 * Tests for the loading skeleton components used in the properties section.
 * Validates that skeletons match the final card layout and have proper animations.
 *
 * @jest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
	PropertyCardSkeleton,
	PropertyGridSkeleton
} from '../property-card-skeleton'

describe('PropertyCardSkeleton', () => {
	describe('Basic Rendering', () => {
		it('should render skeleton card', () => {
			render(<PropertyCardSkeleton />)
			expect(screen.getByTestId('property-card-skeleton')).toBeInTheDocument()
		})

		it('should have card-standard class for consistent styling', () => {
			render(<PropertyCardSkeleton />)
			const card = screen.getByTestId('property-card-skeleton')
			expect(card).toHaveClass('card-standard')
		})

		it('should have animation classes', () => {
			render(<PropertyCardSkeleton />)
			const card = screen.getByTestId('property-card-skeleton')
			expect(card).toHaveClass('animate-in')
			expect(card).toHaveClass('fade-in')
			expect(card).toHaveClass('slide-in-from-bottom-4')
		})
	})

	describe('Layout Structure', () => {
		it('should render image skeleton with aspect-video', () => {
			const { container } = render(<PropertyCardSkeleton />)
			const imageSkeleton = container.querySelector('.aspect-video')
			expect(imageSkeleton).toBeInTheDocument()
		})

		it('should render three metric skeletons in grid', () => {
			const { container } = render(<PropertyCardSkeleton />)
			const metricGrid = container.querySelector('.grid-cols-3')
			expect(metricGrid).toBeInTheDocument()
		})

		it('should render button skeleton', () => {
			const { container } = render(<PropertyCardSkeleton />)
			// Button skeleton should be full width
			const buttonSkeleton = container.querySelector('.w-full.rounded-md')
			expect(buttonSkeleton).toBeInTheDocument()
		})
	})

	describe('Custom Styling', () => {
		it('should apply custom className', () => {
			render(<PropertyCardSkeleton className="custom-class" />)
			const card = screen.getByTestId('property-card-skeleton')
			expect(card).toHaveClass('custom-class')
		})

		it('should apply custom style', () => {
			render(<PropertyCardSkeleton style={{ animationDelay: '100ms' }} />)
			const card = screen.getByTestId('property-card-skeleton')
			expect(card).toHaveStyle({ animationDelay: '100ms' })
		})
	})
})

describe('PropertyGridSkeleton', () => {
	describe('Default Rendering', () => {
		it('should render 6 skeleton cards by default', () => {
			render(<PropertyGridSkeleton />)
			const skeletons = screen.getAllByTestId('property-card-skeleton')
			expect(skeletons).toHaveLength(6)
		})

		it('should have property-grid class', () => {
			const { container } = render(<PropertyGridSkeleton />)
			const grid = container.querySelector('.property-grid')
			expect(grid).toBeInTheDocument()
		})
	})

	describe('Custom Count', () => {
		it('should render specified number of skeleton cards', () => {
			render(<PropertyGridSkeleton count={3} />)
			const skeletons = screen.getAllByTestId('property-card-skeleton')
			expect(skeletons).toHaveLength(3)
		})

		it('should render 12 skeleton cards when count is 12', () => {
			render(<PropertyGridSkeleton count={12} />)
			const skeletons = screen.getAllByTestId('property-card-skeleton')
			expect(skeletons).toHaveLength(12)
		})
	})

	describe('Staggered Animation', () => {
		it('should apply staggered animation delays to skeleton cards', () => {
			render(<PropertyGridSkeleton count={4} />)
			const skeletons = screen.getAllByTestId('property-card-skeleton')

			// Each card should have increasing animation delay (75ms increments)
			expect(skeletons[0]).toHaveStyle({ animationDelay: '0ms' })
			expect(skeletons[1]).toHaveStyle({ animationDelay: '75ms' })
			expect(skeletons[2]).toHaveStyle({ animationDelay: '150ms' })
			expect(skeletons[3]).toHaveStyle({ animationDelay: '225ms' })
		})
	})
})
