import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '#test/utils/test-render'
import { ErrorPage } from './error-page'

vi.mock('@sentry/nextjs', () => ({
	captureException: vi.fn()
}))

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

describe('ErrorPage', () => {
	const mockError = new Error('Test error')
	const mockReset = vi.fn()

	it('renders error heading and message', () => {
		render(<ErrorPage error={mockError} resetAction={mockReset} />)
		expect(screen.getByText('Something went wrong')).toBeInTheDocument()
		expect(
			screen.getByText('An unexpected error occurred. Please try again.')
		).toBeInTheDocument()
	})

	it('calls resetAction when Try Again is clicked', async () => {
		const user = userEvent.setup()
		render(<ErrorPage error={mockError} resetAction={mockReset} />)
		await user.click(screen.getByRole('button', { name: /try again/i }))
		expect(mockReset).toHaveBeenCalledOnce()
	})

	it('renders dashboard link with default href', () => {
		render(<ErrorPage error={mockError} resetAction={mockReset} />)
		const link = screen.getByRole('link', { name: /go to dashboard/i })
		expect(link).toHaveAttribute('href', '/dashboard')
	})

	it('renders dashboard link with custom href', () => {
		render(
			<ErrorPage
				error={mockError}
				resetAction={mockReset}
				dashboardHref="/tenant"
			/>
		)
		const link = screen.getByRole('link', { name: /go to dashboard/i })
		expect(link).toHaveAttribute('href', '/tenant')
	})

	it('reports error to Sentry on mount', async () => {
		const { captureException } = await import('@sentry/nextjs')
		render(<ErrorPage error={mockError} resetAction={mockReset} />)
		expect(captureException).toHaveBeenCalledWith(mockError)
	})
})
