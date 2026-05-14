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

	it('infers "Back to Dashboard" label when href is "/dashboard"', () => {
		render(<NotFoundPage dashboardHref="/dashboard" />)
		const link = screen.getByRole('link', { name: /back to dashboard/i })
		expect(link).toHaveAttribute('href', '/dashboard')
	})

	it('infers "Back to Home" label when href is "/"', () => {
		render(<NotFoundPage dashboardHref="/" />)
		const link = screen.getByRole('link', { name: /back to home/i })
		expect(link).toHaveAttribute('href', '/')
	})

	it('falls back to "Go back" for non-standard hrefs', () => {
		render(<NotFoundPage dashboardHref="/tenant" />)
		const link = screen.getByRole('link', { name: /go back/i })
		expect(link).toHaveAttribute('href', '/tenant')
	})

	it('honors explicit dashboardLabel override', () => {
		render(
			<NotFoundPage dashboardHref="/tenant" dashboardLabel="Back to your area" />
		)
		const link = screen.getByRole('link', { name: /back to your area/i })
		expect(link).toHaveAttribute('href', '/tenant')
	})
})
