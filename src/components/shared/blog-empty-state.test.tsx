import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BlogEmptyState } from './blog-empty-state'

describe('BlogEmptyState', () => {
	it('renders with role="status"', () => {
		render(<BlogEmptyState />)
		expect(screen.getByRole('status')).toBeInTheDocument()
	})

	it('renders "No posts found" message text', () => {
		render(<BlogEmptyState />)
		const elements = screen.getAllByText('No posts found')
		expect(elements.length).toBeGreaterThanOrEqual(1)
	})

	it('renders sr-only text for screen readers', () => {
		render(<BlogEmptyState />)
		const srElements = document.querySelectorAll('.sr-only')
		expect(srElements.length).toBeGreaterThan(0)
		const firstElement = srElements[0]
		expect(firstElement).toBeDefined()
		expect(firstElement?.textContent).toBe('No posts found')
	})

	it('renders with custom message when provided', () => {
		render(<BlogEmptyState message="No articles in this category" />)
		const elements = screen.getAllByText('No articles in this category')
		expect(elements.length).toBeGreaterThanOrEqual(1)
	})

	it('does not render any button elements', () => {
		render(<BlogEmptyState />)
		expect(screen.queryAllByRole('button')).toHaveLength(0)
	})

	it('applies custom className', () => {
		const { container } = render(
			<BlogEmptyState className="my-custom-class" />
		)
		expect(container.firstChild).toHaveClass('my-custom-class')
	})

	it('renders the typewriter animation style block', () => {
		const { container } = render(<BlogEmptyState />)
		const styleTag = container.querySelector('style')
		expect(styleTag).not.toBeNull()
		expect(styleTag?.textContent).toContain('@keyframes typewriter-line')
		expect(styleTag?.textContent).toContain('@keyframes typewriter-cursor')
	})
})
