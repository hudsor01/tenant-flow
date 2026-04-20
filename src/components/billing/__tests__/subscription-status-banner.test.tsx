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

	it('renders trial banner with days remaining when status is trialing', () => {
		const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'trialing',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(screen.getByText(/5 days left in your trial/i)).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /upgrade/i })
		expect(link).toHaveAttribute('href', '/billing/plans?source=trial_banner')
	})

	it('uses singular "day" when one day remains', () => {
		const trialEndsAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'trialing',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(screen.getByText(/1 day left in your trial/i)).toBeInTheDocument()
	})

	it('shows ended message when trial is in the past', () => {
		const trialEndsAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'trialing',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
				trialEndsAt,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(screen.getByText(/your trial ended/i)).toBeInTheDocument()
	})

	it('renders generic trial banner when trialing but trial_ends_at is missing', () => {
		mockUseSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'trialing',
				stripeCustomerId: 'cus_123',
				stripePriceId: 'price_123',
				currentPeriodEnd: '2026-04-01',
				cancelAtPeriodEnd: false,
				trialEndsAt: null,
			},
			isLoading: false,
		})

		render(<SubscriptionStatusBanner />)

		expect(screen.getByText(/on a free trial/i)).toBeInTheDocument()
		const link = screen.getByRole('link', { name: /upgrade/i })
		expect(link).toHaveAttribute('href', '/billing/plans?source=trial_banner')
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
