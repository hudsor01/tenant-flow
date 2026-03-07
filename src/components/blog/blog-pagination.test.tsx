/**
 * BlogPagination Component Tests
 *
 * Tests for the URL-driven pagination component using nuqs
 * for blog list navigation.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockSetPage = vi.hoisted(() => vi.fn())
const mockPage = vi.hoisted(() => ({ value: 1 }))

vi.mock('nuqs', () => ({
	parseAsInteger: {
		withDefault: () => ({
			parse: (v: string) => parseInt(v, 10),
		}),
	},
	useQueryState: () => [mockPage.value, mockSetPage] as const,
}))

import { BlogPagination } from './blog-pagination'

describe('BlogPagination', () => {
	beforeEach(() => {
		mockSetPage.mockClear()
		mockPage.value = 1
	})

	it('renders "Page 1 of 5" text', () => {
		render(<BlogPagination totalPages={5} />)
		expect(screen.getByText('Page 1 of 5')).toBeInTheDocument()
	})

	it('previous button is disabled on page 1', () => {
		render(<BlogPagination totalPages={5} />)
		const prevButton = screen.getByRole('button', {
			name: 'Previous page',
		})
		expect(prevButton).toBeDisabled()
	})

	it('next button is disabled on last page', () => {
		mockPage.value = 5
		render(<BlogPagination totalPages={5} />)
		const nextButton = screen.getByRole('button', { name: 'Next page' })
		expect(nextButton).toBeDisabled()
	})

	it('both buttons are enabled on middle page', () => {
		mockPage.value = 3
		render(<BlogPagination totalPages={5} />)
		const prevButton = screen.getByRole('button', {
			name: 'Previous page',
		})
		const nextButton = screen.getByRole('button', { name: 'Next page' })
		expect(prevButton).not.toBeDisabled()
		expect(nextButton).not.toBeDisabled()
	})

	it('returns null when totalPages is 0', () => {
		const { container } = render(<BlogPagination totalPages={0} />)
		expect(container.firstChild).toBeNull()
	})

	it('returns null when totalPages is 1', () => {
		const { container } = render(<BlogPagination totalPages={1} />)
		expect(container.firstChild).toBeNull()
	})

	it('renders nav element with aria-label', () => {
		render(<BlogPagination totalPages={5} />)
		const nav = screen.getByRole('navigation', {
			name: 'Blog pagination',
		})
		expect(nav).toBeInTheDocument()
	})

	it('calls setPage with next value on next click', async () => {
		const user = userEvent.setup()
		render(<BlogPagination totalPages={5} />)
		const nextButton = screen.getByRole('button', { name: 'Next page' })
		await user.click(nextButton)
		expect(mockSetPage).toHaveBeenCalledWith(2)
	})

	it('calls setPage with null when going back to page 1', async () => {
		mockPage.value = 2
		const user = userEvent.setup()
		render(<BlogPagination totalPages={5} />)
		const prevButton = screen.getByRole('button', {
			name: 'Previous page',
		})
		await user.click(prevButton)
		expect(mockSetPage).toHaveBeenCalledWith(null)
	})

	it('applies custom className', () => {
		const { container } = render(
			<BlogPagination totalPages={5} className="custom-pagination" />
		)
		const nav = container.querySelector('nav')
		expect(nav).toHaveClass('custom-pagination')
	})
})
