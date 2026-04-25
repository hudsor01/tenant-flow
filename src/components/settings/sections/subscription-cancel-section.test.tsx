import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const hooks = vi.hoisted(() => ({
	useSubscriptionStatus: vi.fn(),
	useCancelSubscriptionMutation: vi.fn(),
	useReactivateSubscriptionMutation: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn()
}))

vi.mock('#hooks/api/use-billing', () => ({
	useSubscriptionStatus: hooks.useSubscriptionStatus
}))
vi.mock('#hooks/api/use-billing-mutations', () => ({
	useCancelSubscriptionMutation: hooks.useCancelSubscriptionMutation,
	useReactivateSubscriptionMutation: hooks.useReactivateSubscriptionMutation
}))
vi.mock('#components/settings/gdpr-data-actions', () => ({
	GdprDataActions: ({ variant }: { variant?: string }) => (
		<div data-testid="gdpr-actions" data-variant={variant}>
			<button aria-label="Download my data as JSON">Download My Data</button>
			<button aria-label="Request permanent account deletion">Delete Account</button>
		</div>
	)
}))
vi.mock('sonner', () => ({
	toast: { success: hooks.toastSuccess, error: hooks.toastError }
}))

import { SubscriptionCancelSection } from './subscription-cancel-section'

type CancelReturn = ReturnType<typeof hooks.useCancelSubscriptionMutation>

function mutationMock(overrides: Partial<CancelReturn> = {}): CancelReturn {
	return {
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		isPending: false,
		isError: false,
		isSuccess: false,
		isIdle: true,
		data: undefined,
		error: null,
		reset: vi.fn(),
		variables: undefined,
		status: 'idle',
		submittedAt: 0,
		failureCount: 0,
		failureReason: null,
		context: undefined,
		...overrides
	} as unknown as CancelReturn
}

function mockActive(overrides: { cancelAtPeriodEnd?: boolean } = {}) {
	hooks.useSubscriptionStatus.mockReturnValue({
		data: {
			subscriptionStatus: 'active',
			stripeCustomerId: 'cus_test',
			stripePriceId: 'price_test',
			currentPeriodEnd: '2026-06-15T12:00:00Z',
			cancelAtPeriodEnd: overrides.cancelAtPeriodEnd ?? false
		},
		isLoading: false,
		isError: false,
		refetch: vi.fn()
	})
}

function mockCanceled() {
	hooks.useSubscriptionStatus.mockReturnValue({
		data: {
			subscriptionStatus: 'canceled',
			stripeCustomerId: 'cus_test',
			stripePriceId: 'price_test',
			currentPeriodEnd: '2026-03-15T12:00:00Z',
			cancelAtPeriodEnd: false
		},
		isLoading: false,
		isError: false,
		refetch: vi.fn()
	})
}

describe('SubscriptionCancelSection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		hooks.useCancelSubscriptionMutation.mockReturnValue(mutationMock())
		hooks.useReactivateSubscriptionMutation.mockReturnValue(mutationMock())
	})

	it('renders skeleton while subscription status is loading', () => {
		cleanup()
		hooks.useSubscriptionStatus.mockReturnValue({
			data: undefined,
			isLoading: true,
			isError: false,
			refetch: vi.fn()
		})
		const { container } = render(<SubscriptionCancelSection />)
		// SubscriptionCancelSection uses a raw animate-pulse div for its
		// skeleton (not the <Skeleton/> primitive), so check the class.
		expect(container.querySelector('.animate-pulse')).not.toBeNull()
	})

	it('returns null when subscriptionStatus is null (no subscription)', () => {
		cleanup()
		hooks.useSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: null,
				stripeCustomerId: null,
				stripePriceId: null,
				currentPeriodEnd: null,
				cancelAtPeriodEnd: false
			},
			isLoading: false,
			isError: false,
			refetch: vi.fn()
		})
		const { container } = render(<SubscriptionCancelSection />)
		expect(container.firstChild).toBeNull()
	})

	it('returns null when subscriptionStatus is past_due', () => {
		cleanup()
		hooks.useSubscriptionStatus.mockReturnValue({
			data: {
				subscriptionStatus: 'past_due',
				stripeCustomerId: 'cus_test',
				stripePriceId: 'price_test',
				currentPeriodEnd: '2026-06-15T12:00:00Z',
				cancelAtPeriodEnd: false
			},
			isLoading: false,
			isError: false,
			refetch: vi.fn()
		})
		const { container } = render(<SubscriptionCancelSection />)
		expect(container.firstChild).toBeNull()
	})

	it("renders State 1 (Active) when subscriptionStatus='active' and cancelAtPeriodEnd=false", () => {
		cleanup()
		mockActive()
		render(<SubscriptionCancelSection />)
		expect(screen.getByText('Cancel Subscription')).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /cancel my subscription/i })
		).toBeInTheDocument()
		expect(screen.queryByText(/subscription ends/i)).toBeNull()
		expect(screen.queryByText(/your plan ended on/i)).toBeNull()
	})

	it('clicking Cancel Plan opens AlertDialog with D2 copy', async () => {
		cleanup()
		mockActive()
		render(<SubscriptionCancelSection />)
		await userEvent.click(
			screen.getByRole('button', { name: /cancel my subscription/i })
		)
		expect(screen.getByRole('alertdialog')).toBeInTheDocument()
		expect(screen.getByText('Cancel your subscription?')).toBeInTheDocument()
		// Description contains the formatted end date (June 15, 2026 from '2026-06-15T12:00:00Z')
		expect(
			screen.getByText(/your plan will stay active until/i)
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /keep my plan/i })
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /confirm subscription cancellation/i })
		).toBeInTheDocument()
	})

	it('confirming AlertDialog fires useCancelSubscriptionMutation().mutate()', async () => {
		cleanup()
		mockActive()
		const mutate = vi.fn()
		hooks.useCancelSubscriptionMutation.mockReturnValue(mutationMock({ mutate }))
		render(<SubscriptionCancelSection />)
		await userEvent.click(
			screen.getByRole('button', { name: /cancel my subscription/i })
		)
		await userEvent.click(
			screen.getByRole('button', { name: /confirm subscription cancellation/i })
		)
		expect(mutate).toHaveBeenCalledTimes(1)
	})

	it("renders State 2 (Cancel-scheduled) when cancelAtPeriodEnd=true and status='active'", () => {
		cleanup()
		mockActive({ cancelAtPeriodEnd: true })
		render(<SubscriptionCancelSection />)
		expect(screen.getByText(/subscription ends/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: /reactivate subscription/i })
		).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: /cancel my subscription/i })
		).toBeNull()
	})

	it('clicking Reactivate Plan fires useReactivateSubscriptionMutation().mutate()', async () => {
		cleanup()
		mockActive({ cancelAtPeriodEnd: true })
		const mutate = vi.fn()
		hooks.useReactivateSubscriptionMutation.mockReturnValue(
			mutationMock({ mutate })
		)
		render(<SubscriptionCancelSection />)
		await userEvent.click(
			screen.getByRole('button', { name: /reactivate subscription/i })
		)
		expect(mutate).toHaveBeenCalledTimes(1)
		expect(screen.queryByRole('alertdialog')).toBeNull()
	})

	it('renders State 3 (Canceled) with GdprDataActions inline', () => {
		cleanup()
		mockCanceled()
		render(<SubscriptionCancelSection />)
		expect(screen.getByText(/your plan ended on/i)).toBeInTheDocument()
		expect(screen.getByText(/your data will be deleted on/i)).toBeInTheDocument()
		expect(
			screen.getByRole('link', { name: /need to come back\? view plans/i })
		).toBeInTheDocument()
		// GdprDataActions mock mounts with data-variant="inline"
		const gdpr = screen.getByTestId('gdpr-actions')
		expect(gdpr).toHaveAttribute('data-variant', 'inline')
	})

	it('mutation loading state disables confirmation button and shows Canceling... label', async () => {
		cleanup()
		mockActive()
		hooks.useCancelSubscriptionMutation.mockReturnValue(
			mutationMock({ isPending: true })
		)
		render(<SubscriptionCancelSection />)
		await userEvent.click(
			screen.getByRole('button', { name: /cancel my subscription/i })
		)
		const confirm = screen.getByRole('button', {
			name: /confirm subscription cancellation/i
		})
		expect(confirm).toBeDisabled()
		expect(confirm).toHaveTextContent(/canceling\.\.\./i)
	})

	it('isError state renders neutral fallback with Retry', () => {
		cleanup()
		const refetch = vi.fn()
		hooks.useSubscriptionStatus.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
			refetch
		})
		render(<SubscriptionCancelSection />)
		expect(
			screen.getByText(/subscription status unavailable/i)
		).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
	})
})
