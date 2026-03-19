import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '#test/utils/test-render'
import { NotFoundPage } from './not-found-page'

vi.mock('next/link', () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode
		href: string
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	)
}))

describe('NotFoundPage', () => {
	it('renders page not found alert', () => {
		render(<NotFoundPage />)
		expect(screen.getByText('Page not found')).toBeInTheDocument()
		expect(
			screen.getByText(/does not exist or has been removed/)
		).toBeInTheDocument()
	})

	it('renders dashboard link with default href', () => {
		render(<NotFoundPage />)
		const link = screen.getByRole('link', { name: /back to dashboard/i })
		expect(link).toHaveAttribute('href', '/dashboard')
	})

	it('renders dashboard link with custom href', () => {
		render(<NotFoundPage dashboardHref="/tenant" />)
		const link = screen.getByRole('link', { name: /back to dashboard/i })
		expect(link).toHaveAttribute('href', '/tenant')
	})
})
