import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const mockMutate = vi.hoisted(() => vi.fn())
const mockUseMutation = vi.hoisted(() =>
	vi.fn(() => ({
		mutate: mockMutate,
		isPending: false,
	}))
)

vi.mock('@tanstack/react-query', () => ({
	useMutation: mockUseMutation,
}))

vi.mock('#lib/supabase/client', () => ({
	createClient: vi.fn(() => ({
		functions: { invoke: vi.fn() },
	})),
}))

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}))

import { NewsletterSignup } from './newsletter-signup'

describe('NewsletterSignup', () => {
	it('renders email input with type="email"', () => {
		render(<NewsletterSignup />)
		const input = screen.getByPlaceholderText(/email/i)
		expect(input).toHaveAttribute('type', 'email')
	})

	it('renders submit button', () => {
		render(<NewsletterSignup />)
		expect(
			screen.getByRole('button', { name: /subscribe/i })
		).toBeInTheDocument()
	})

	it('button is disabled when mutation is pending', () => {
		mockUseMutation.mockReturnValueOnce({
			mutate: mockMutate,
			isPending: true,
		})
		render(<NewsletterSignup />)
		expect(
			screen.getByRole('button', { name: /subscrib/i })
		).toBeDisabled()
	})

	it('input has required attribute', () => {
		render(<NewsletterSignup />)
		const input = screen.getByPlaceholderText(/email/i)
		expect(input).toBeRequired()
	})

	it('renders a form element', () => {
		render(<NewsletterSignup />)
		expect(screen.getByRole('form')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = render(
			<NewsletterSignup className="custom-class" />
		)
		expect(container.firstChild).toHaveClass('custom-class')
	})
})
