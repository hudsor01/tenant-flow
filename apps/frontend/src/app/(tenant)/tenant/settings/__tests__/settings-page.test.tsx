/**
 * Tests for updated settings page with payment comparison
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the hooks
vi.mock('#hooks/api/use-payment-methods', () => ({
	usePaymentMethods: () => ({
		data: [],
		isLoading: false,
		refetch: vi.fn()
	}),
	useSetDefaultPaymentMethod: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useDeletePaymentMethod: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

vi.mock('#hooks/api/use-stripe-connect', () => ({
	useConnectedAccount: () => ({
		data: null,
		isLoading: false
	}),
	useCreateConnectAccount: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useCreateConnectedAccount: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	}),
	useRefreshOnboarding: () => ({
		mutateAsync: vi.fn(),
		isPending: false
	})
}))

function renderWithProviders(component: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	return render(
		<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
	)
}

describe('Settings Page with Payment Comparison', () => {
	it('displays side-by-side payment option cards instead of tabs (4.1)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Should show both payment option headings
		expect(
			screen.getByRole('heading', { name: 'Add Payment Method' })
		).toBeInTheDocument()
		expect(
			screen.getByRole('heading', { name: 'Stripe Connect' })
		).toBeInTheDocument()

		// Should NOT have tabs (the old tab interface)
		expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
	})

	it('includes clear descriptions for each payment option (4.1)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Check for descriptive text
		expect(screen.getByText(/save a card or bank account/i)).toBeInTheDocument()
		expect(screen.getByText(/direct bank connection/i)).toBeInTheDocument()
	})

	it('indicates "Add Payment Method" as recommended for autopay (4.2)', async () => {
		const SettingsPage = (await import('../page')).default

		renderWithProviders(<SettingsPage />)

		// Find the recommended badge
		const badges = screen.getAllByRole('status')
		expect(badges.length).toBeGreaterThan(0)
		expect(badges[0]).toHaveTextContent('Recommended')
	})
})
