import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SubscriptionStatusBanner } from '../subscription-status-banner'

const mockUseSubscriptionStatus = vi.fn()

vi.mock('#hooks/api/use-billing', () => ({
	useSubscriptionStatus: () => mockUseSubscriptionStatus(),
}))

describe('SubscriptionStatusBanner', () => {
	it('renders nothing when loading', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: undefined,
			isLoading: true,
		})

		const { container } = render(<SubscriptionStatusBanner />)
		expect(container.innerHTML).toBe('')
	})

	it('renders blue info banner when subscription is null (no stripe customer)', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: null,
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(
			screen.getByText(/start your subscription/i)
		).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /view plans/i })
		expect(link).toHaveAttribute('href', '/pricing')
	})

	it('renders blue info banner when subscriptionStatus is null (has stripe customer but no sub)', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: null,
				stripeCustomerId: 'cus_123',
				stripePriceId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(
			screen.getByText(/start your subscription/i)
		).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /view plans/i })
		expect(link).toHaveAttribute('href', '/pricing')
	})

	it('renders nothing when status is active', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'active',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		const { container } = render(<SubscriptionStatusBanner />)
		expect(container.innerHTML).toBe('')
	})

	it('renders amber warning banner when status is past_due', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'past_due',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(
			screen.getByText(/payment failed/i)
		).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /update billing/i })
		expect(link).toHaveAttribute('href', '/owner/billing')
	})

	it('renders nothing when status is trialing', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'trialing',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		const { container } = render(<SubscriptionStatusBanner />)
		expect(container.innerHTML).toBe('')
	})

	it('renders red lock banner when status is unpaid', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'unpaid',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(
			screen.getByText(/subscription is inactive/i)
		).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /reactivate/i })
		expect(link).toHaveAttribute('href', '/owner/billing')
	})

	it('renders red lock banner when status is canceled', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'canceled',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(
			screen.getByText(/subscription is inactive/i)
		).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /reactivate/i })
		expect(link).toHaveAttribute('href', '/owner/billing')
	})
})
